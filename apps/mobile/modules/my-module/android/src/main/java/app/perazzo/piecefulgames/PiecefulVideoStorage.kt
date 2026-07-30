package app.perazzo.piecefulgames

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

internal object PiecefulVideoStorage {
  fun save(context: Context, source: Uri): String {
    val name = "pieceful-${System.currentTimeMillis()}.mp4"
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
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
        openInput(context, source).use { input ->
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
      openInput(context, source).use { input ->
        FileOutputStream(destination).use { output -> input.copyTo(output) }
      }
      MediaScannerConnection.scanFile(
        context,
        arrayOf(destination.absolutePath),
        arrayOf("video/mp4"),
        null,
      )
      Uri.fromFile(destination).toString()
    }
  }

  private fun openInput(context: Context, uri: Uri) = when (uri.scheme) {
    "content" -> requireNotNull(context.contentResolver.openInputStream(uri))
    "file" -> FileInputStream(requireNotNull(uri.path))
    else -> FileInputStream(uri.toString())
  }
}
