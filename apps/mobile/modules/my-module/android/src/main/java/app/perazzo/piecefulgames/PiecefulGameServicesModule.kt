package app.perazzo.piecefulgames

import android.content.Context
import android.net.Uri
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.io.File
import java.util.UUID

class PiecefulGameServicesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PiecefulGameServices")
    Events("onTimelapseProgress")

    AsyncFunction("authenticate") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "Unable to authenticate Play Games without an Activity", null)
        return@AsyncFunction
      }
      PlayGamesSdk.initialize(activity.applicationContext)
      PlayGames.getGamesSignInClient(activity).signIn().addOnCompleteListener { task ->
        if (task.isSuccessful) {
          promise.resolve(mapOf("authenticated" to task.result.isAuthenticated))
        } else {
          promise.reject("ERR_PLAY_GAMES_AUTH", task.exception?.localizedMessage, task.exception)
        }
      }
    }

    AsyncFunction("reportAchievement") { identifier: String, percent: Double, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "Unable to report achievement without an Activity", null)
        return@AsyncFunction
      }
      val client = PlayGames.getAchievementsClient(activity)
      if (percent >= 100) client.unlock(identifier) else client.setSteps(identifier, percent.toInt().coerceAtLeast(0))
      promise.resolve(null)
    }

    AsyncFunction("showAchievements") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "Unable to show achievements without an Activity", null)
        return@AsyncFunction
      }
      PlayGames.getAchievementsClient(activity).achievementsIntent.addOnSuccessListener { intent ->
        activity.startActivity(intent)
        promise.resolve(null)
      }.addOnFailureListener { error ->
        promise.reject("ERR_PLAY_GAMES_UI", error.localizedMessage, error)
      }
    }

    AsyncFunction("checkForAppUpdate") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(mapOf("available" to false, "inProgress" to false))
        return@AsyncFunction
      }
      val manager = AppUpdateManagerFactory.create(activity.applicationContext)
      manager.appUpdateInfo.addOnSuccessListener { info ->
        val availability = info.updateAvailability()
        promise.resolve(
          mapOf(
            "available" to (
              availability == UpdateAvailability.UPDATE_AVAILABLE &&
                info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
            ),
            "inProgress" to (availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS),
            "versionCode" to info.availableVersionCode(),
          ),
        )
      }.addOnFailureListener {
        // This can fail outside Google Play or while offline. An update check
        // must never prevent the player from opening Pieceful.
        promise.resolve(mapOf("available" to false, "inProgress" to false))
      }
    }

    AsyncFunction("startAppUpdate") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "Unable to start an update without an Activity", null)
        return@AsyncFunction
      }
      val manager = AppUpdateManagerFactory.create(activity.applicationContext)
      manager.appUpdateInfo.addOnSuccessListener { info ->
        val availability = info.updateAvailability()
        val canStart =
          availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS ||
            (availability == UpdateAvailability.UPDATE_AVAILABLE &&
              info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE))
        if (!canStart) {
          promise.resolve(false)
          return@addOnSuccessListener
        }
        val options = AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()
        manager.startUpdateFlow(info, activity, options).addOnCompleteListener { task ->
          if (task.isSuccessful) {
            promise.resolve(true)
          } else {
            promise.reject("ERR_APP_UPDATE", task.exception?.localizedMessage, task.exception)
          }
        }
      }.addOnFailureListener { error ->
        promise.reject("ERR_APP_UPDATE_CHECK", error.localizedMessage, error)
      }
    }

    AsyncFunction("createTimelapse") { payload: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("ERR_NO_CONTEXT", "Unable to create a video without an Android context", null)
        return@AsyncFunction
      }
      Thread {
        try {
          val uri = PiecefulTimelapseEncoder(context).encode(JSONObject(payload)) { progress ->
            sendEvent("onTimelapseProgress", mapOf("progress" to progress))
          }
          promise.resolve(uri)
        } catch (error: Throwable) {
          promise.reject("ERR_TIMELAPSE", error.localizedMessage ?: "Unable to create timelapse", error)
        }
      }.start()
    }

    AsyncFunction("enqueueTimelapse") { payload: String, puzzleId: String, puzzleName: String, language: String, promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) {
        promise.reject("ERR_NO_CONTEXT", "Unable to schedule a video without an Android context", null)
        return@AsyncFunction
      }
      try {
        val jobId = UUID.randomUUID().toString()
        val directory = File(context.filesDir, "timelapse-jobs").apply { mkdirs() }
        val payloadFile = File(directory, "$jobId.json").apply { writeText(payload) }
        val input = Data.Builder()
          .putString(PiecefulTimelapseWorker.KEY_JOB_ID, jobId)
          .putString(PiecefulTimelapseWorker.KEY_PUZZLE_ID, puzzleId)
          .putString(PiecefulTimelapseWorker.KEY_PUZZLE_NAME, puzzleName)
          .putString(PiecefulTimelapseWorker.KEY_LANGUAGE, language)
          .putString(PiecefulTimelapseWorker.KEY_PAYLOAD_PATH, payloadFile.absolutePath)
          .build()
        val request = OneTimeWorkRequest.Builder(PiecefulTimelapseWorker::class.java)
          .setInputData(input)
          .addTag("pieceful-timelapse")
          .addTag("pieceful-timelapse-$puzzleId")
          .build()
        val queued = JSONObject().apply {
          put("jobId", jobId)
          put("puzzleId", puzzleId)
          put("status", "queued")
          put("progress", 0)
          put("updatedAt", System.currentTimeMillis())
        }
        context.getSharedPreferences(PiecefulTimelapseWorker.PREFS_NAME, Context.MODE_PRIVATE)
          .edit()
          .putString(puzzleId, queued.toString())
          .apply()
        PiecefulTimelapseWorker.createNotificationChannel(context)
        WorkManager.getInstance(context).enqueueUniqueWork(
          "pieceful-timelapse-$puzzleId",
          ExistingWorkPolicy.REPLACE,
          request,
        )
        promise.resolve(jobId)
      } catch (error: Throwable) {
        promise.reject("ERR_TIMELAPSE_QUEUE", error.localizedMessage ?: "Unable to schedule timelapse", error)
      }
    }

    AsyncFunction("getTimelapseJob") { puzzleId: String, promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      val value = context.getSharedPreferences(PiecefulTimelapseWorker.PREFS_NAME, Context.MODE_PRIVATE)
        .getString(puzzleId, null)
      if (value == null) {
        promise.resolve(null)
      } else {
        val json = JSONObject(value)
        promise.resolve(
          mapOf(
            "jobId" to json.optString("jobId"),
            "puzzleId" to json.optString("puzzleId"),
            "status" to json.optString("status"),
            "progress" to json.optInt("progress"),
            "fileUri" to json.optString("fileUri").takeIf { it.isNotBlank() && it != "null" },
            "galleryUri" to json.optString("galleryUri").takeIf { it.isNotBlank() && it != "null" },
            "error" to json.optString("error").takeIf { it.isNotBlank() && it != "null" },
          ),
        )
      }
    }

    AsyncFunction("saveVideoToGallery") { value: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("ERR_NO_CONTEXT", "Unable to save a video without an Android context", null)
        return@AsyncFunction
      }
      Thread {
        try {
          val savedUri = PiecefulVideoStorage.save(context, Uri.parse(value))
          promise.resolve(savedUri)
        } catch (error: Throwable) {
          promise.reject("ERR_SAVE_VIDEO", error.localizedMessage ?: "Unable to save the video", error)
        }
      }.start()
    }
  }
}
