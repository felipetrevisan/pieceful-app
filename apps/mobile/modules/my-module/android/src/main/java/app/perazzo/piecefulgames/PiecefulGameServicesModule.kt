package app.perazzo.piecefulgames

import android.content.ContentValues
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

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

    AsyncFunction("saveVideoToGallery") { value: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("ERR_NO_CONTEXT", "Unable to save a video without an Android context", null)
        return@AsyncFunction
      }
      Thread {
        try {
          val source = Uri.parse(value)
          val name = "pieceful-${System.currentTimeMillis()}.mp4"
          val savedUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
              put(MediaStore.Video.Media.DISPLAY_NAME, name)
              put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
              put(MediaStore.Video.Media.RELATIVE_PATH, "${Environment.DIRECTORY_MOVIES}/Pieceful")
              put(MediaStore.Video.Media.IS_PENDING, 1)
            }
            val destination = requireNotNull(
              context.contentResolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values),
            ) { "Unable to create the video in the media library" }
            try {
              openVideoInput(context, source).use { input ->
                requireNotNull(context.contentResolver.openOutputStream(destination)).use { output ->
                  input.copyTo(output)
                }
              }
              values.clear()
              values.put(MediaStore.Video.Media.IS_PENDING, 0)
              context.contentResolver.update(destination, values, null, null)
              destination.toString()
            } catch (error: Throwable) {
              context.contentResolver.delete(destination, null, null)
              throw error
            }
          } else {
            val directory = requireNotNull(context.getExternalFilesDir(Environment.DIRECTORY_MOVIES))
            val destination = File(directory, name)
            openVideoInput(context, source).use { input ->
              FileOutputStream(destination).use { output -> input.copyTo(output) }
            }
            MediaScannerConnection.scanFile(context, arrayOf(destination.absolutePath), arrayOf("video/mp4"), null)
            Uri.fromFile(destination).toString()
          }
          promise.resolve(savedUri)
        } catch (error: Throwable) {
          promise.reject("ERR_SAVE_VIDEO", error.localizedMessage ?: "Unable to save the video", error)
        }
      }.start()
    }
  }

  private fun openVideoInput(context: android.content.Context, uri: Uri) = when (uri.scheme) {
    "content" -> requireNotNull(context.contentResolver.openInputStream(uri))
    "file" -> FileInputStream(requireNotNull(uri.path))
    else -> FileInputStream(uri.toString())
  }
}
