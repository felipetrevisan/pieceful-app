package app.perazzo.piecefulgames

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Data
import androidx.work.ForegroundInfo
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.io.File

internal class PiecefulTimelapseWorker(
  context: Context,
  parameters: WorkerParameters,
) : Worker(context, parameters) {
  private val jobId = inputData.getString(KEY_JOB_ID).orEmpty()
  private val puzzleId = inputData.getString(KEY_PUZZLE_ID).orEmpty()
  private val puzzleName = inputData.getString(KEY_PUZZLE_NAME).orEmpty()
  private val language = inputData.getString(KEY_LANGUAGE) ?: "pt-BR"
  private val notificationId = jobId.hashCode().and(0x7fffffff)

  override fun doWork(): Result {
    val payloadPath = inputData.getString(KEY_PAYLOAD_PATH) ?: return Result.failure()
    val payloadFile = File(payloadPath)
    if (!payloadFile.exists()) return Result.failure()

    createNotificationChannel(applicationContext)
    setForegroundAsync(foregroundInfo(0)).get()
    saveStatus("running", 0)

    return try {
      val outputUri = PiecefulTimelapseEncoder(applicationContext).encode(
        JSONObject(payloadFile.readText()),
      ) { progress ->
        if (isStopped) throw InterruptedException("Video generation was stopped")
        setProgressAsync(Data.Builder().putInt(KEY_PROGRESS, progress).build())
        saveStatus("running", progress)
        NotificationManagerCompat.from(applicationContext)
          .notify(notificationId, progressNotification(progress))
      }
      val galleryUri = PiecefulVideoStorage.save(applicationContext, Uri.parse(outputUri))
      saveStatus("completed", 100, outputUri, galleryUri)
      NotificationManagerCompat.from(applicationContext)
        .notify(notificationId, completedNotification())
      payloadFile.delete()
      Result.success(
        Data.Builder()
          .putString(KEY_FILE_URI, outputUri)
          .putString(KEY_GALLERY_URI, galleryUri)
          .build(),
      )
    } catch (error: Throwable) {
      if (!isStopped) {
        saveStatus("failed", 0, error = error.localizedMessage ?: "Unable to create timelapse")
        NotificationManagerCompat.from(applicationContext)
          .notify(notificationId, failedNotification())
      }
      Result.failure()
    }
  }

  private fun foregroundInfo(progress: Int): ForegroundInfo {
    val notification = progressNotification(progress)
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      ForegroundInfo(notificationId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROCESSING)
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ForegroundInfo(notificationId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      ForegroundInfo(notificationId, notification)
    }
  }

  private fun progressNotification(progress: Int) = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
    .setSmallIcon(android.R.drawable.ic_menu_slideshow)
    .setContentTitle(if (language == "en") "Creating your timelapse" else "Criando seu timelapse")
    .setContentText(if (language == "en") "$puzzleName · $progress%" else "$puzzleName · $progress%")
    .setProgress(100, progress, progress == 0)
    .setOnlyAlertOnce(true)
    .setOngoing(true)
    .setContentIntent(openAppIntent())
    .build()

  private fun completedNotification() = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
    .setSmallIcon(android.R.drawable.ic_menu_slideshow)
    .setContentTitle(if (language == "en") "Your video is ready" else "Seu vídeo está pronto")
    .setContentText(
      if (language == "en") "$puzzleName was saved to your gallery."
      else "$puzzleName foi salvo na sua galeria.",
    )
    .setAutoCancel(true)
    .setContentIntent(openAppIntent())
    .build()

  private fun failedNotification() = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
    .setSmallIcon(android.R.drawable.stat_notify_error)
    .setContentTitle(if (language == "en") "Video creation failed" else "Não foi possível criar o vídeo")
    .setContentText(if (language == "en") "Open Pieceful and try again." else "Abra o Pieceful e tente novamente.")
    .setAutoCancel(true)
    .setContentIntent(openAppIntent())
    .build()

  private fun openAppIntent(): PendingIntent {
    val intent = applicationContext.packageManager
      .getLaunchIntentForPackage(applicationContext.packageName)
      ?: Intent()
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    return PendingIntent.getActivity(
      applicationContext,
      notificationId,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun saveStatus(
    status: String,
    progress: Int,
    fileUri: String? = null,
    galleryUri: String? = null,
    error: String? = null,
  ) {
    val value = JSONObject().apply {
      put("jobId", jobId)
      put("puzzleId", puzzleId)
      put("status", status)
      put("progress", progress)
      put("fileUri", fileUri)
      put("galleryUri", galleryUri)
      put("error", error)
      put("updatedAt", System.currentTimeMillis())
    }
    applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(puzzleId, value.toString())
      .apply()
  }

  companion object {
    const val CHANNEL_ID = "pieceful_timelapse"
    const val PREFS_NAME = "pieceful_timelapse_jobs"
    const val KEY_JOB_ID = "jobId"
    const val KEY_PUZZLE_ID = "puzzleId"
    const val KEY_PUZZLE_NAME = "puzzleName"
    const val KEY_LANGUAGE = "language"
    const val KEY_PAYLOAD_PATH = "payloadPath"
    const val KEY_PROGRESS = "progress"
    const val KEY_FILE_URI = "fileUri"
    const val KEY_GALLERY_URI = "galleryUri"

    fun createNotificationChannel(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Timelapse",
        NotificationManager.IMPORTANCE_DEFAULT,
      ).apply {
        description = "Pieceful video generation progress"
      }
      manager.createNotificationChannel(channel)
    }
  }
}
