package app.perazzo.piecefulgames

import android.content.Context
import android.graphics.*
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.net.URL
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

private data class VideoState(val id: String, val x: Float, val y: Float, val rotation: Float, val placed: Boolean, val visible: Boolean)
private data class VideoFrame(val at: Double, val changes: List<VideoState>)
private data class VideoPiece(val id: String, val row: Int, val column: Int, val shape: JSONObject)

internal class PiecefulTimelapseEncoder(private val context: Context) {
  private var width = 720
  private var height = 1280
  private val fps = 24
  private val speed = 60.0

  fun encode(payload: JSONObject, onProgress: (Int) -> Unit): String {
    val source = loadBitmap(payload.getString("imageUri"))
    val logo = payload.optString("logoUri").takeIf { it.isNotBlank() }
      ?.let { runCatching { loadBitmap(it) }.getOrNull() }
    val piecesJson = payload.getJSONArray("pieces")
    val pieces = (0 until piecesJson.length()).map { index ->
      val item = piecesJson.getJSONObject(index)
      VideoPiece(item.getString("id"), item.getInt("row"), item.getInt("column"), item.getJSONObject("shape"))
    }
    val timeline = payload.getJSONObject("timelapse")
    val initial = parseStates(timeline.getJSONArray("initial"))
    val states = initial.associateBy { it.id }.toMutableMap()
    val framesJson = timeline.getJSONArray("frames")
    val frames = (0 until framesJson.length()).map { index ->
      val item = framesJson.getJSONObject(index)
      VideoFrame(item.getDouble("at"), parseStates(item.getJSONArray("changes")))
    }.sortedBy { it.at }
    val rows = payload.getInt("rows")
    val columns = payload.getInt("columns")
    val boardScale = ((1280 / max(rows, columns)) / 16).coerceAtLeast(1) * 16
    width = columns * boardScale
    height = rows * boardScale
    val elapsed = max(1.0, payload.optDouble("elapsed", 1.0))
    val sourceStart = frames.firstOrNull()?.at ?: 0.0
    val sourceEnd = max(sourceStart + 0.12, frames.lastOrNull()?.at ?: elapsed)
    val sourceDuration = max(0.12, sourceEnd - sourceStart)
    val assemblyFrames = max(2, ceil(sourceDuration / speed * fps).toInt())
    val totalFrames = assemblyFrames + fps
    val output = File(context.cacheDir, "pieceful-${System.currentTimeMillis()}.mp4")
    encodeFrames(output, totalFrames) { frameIndex, bitmap ->
      val assemblyIndex = min(frameIndex, assemblyFrames - 1)
      val sourceTime = sourceStart + sourceDuration * assemblyIndex / (assemblyFrames - 1).toDouble()
      states.clear(); initial.forEach { states[it.id] = it }
      var applied = -1
      frames.forEachIndexed { index, frame -> if (frame.at <= sourceTime) { frame.changes.forEach { states[it.id] = it }; applied = index } }
      val next = frames.getOrNull(applied + 1)
      if (next != null && frameIndex < assemblyFrames - 1) {
        val previousTime = if (applied >= 0) frames[applied].at else 0.0
        val amount = ((sourceTime - previousTime) / max(0.001, next.at - previousTime)).coerceIn(0.0, 1.0).toFloat()
        next.changes.forEach { after ->
          val before = states[after.id]
          if (before != null) states[after.id] = interpolate(before, after, amount)
        }
      }
      if (frameIndex >= assemblyFrames - 1) {
        piecesJson.let { array -> (0 until array.length()).forEach { index ->
          val item = array.getJSONObject(index)
          val correct = item.getJSONObject("correctPosition")
          states[item.getString("id")] = VideoState(item.getString("id"), correct.getDouble("x").toFloat(), correct.getDouble("y").toFloat(), correct.getDouble("rotation").toFloat(), true, true)
        }}
      }
      draw(bitmap, source, logo, pieces, states, rows, columns)
      onProgress(((frameIndex + 1) * 100f / totalFrames).toInt())
    }
    source.recycle()
    logo?.recycle()
    return Uri.fromFile(output).toString()
  }

  private fun parseStates(array: JSONArray) = (0 until array.length()).map { index ->
    val item = array.getJSONObject(index)
    VideoState(item.getString("id"), item.getDouble("x").toFloat(), item.getDouble("y").toFloat(), item.getDouble("rotation").toFloat(), item.optBoolean("isPlaced"), item.optBoolean("visible"))
  }

  private fun interpolate(before: VideoState, after: VideoState, amount: Float): VideoState {
    val turn = ((after.rotation - before.rotation + 540f) % 360f) - 180f
    return after.copy(
      x = before.x + (after.x - before.x) * amount,
      y = before.y + (after.y - before.y) * amount,
      rotation = before.rotation + turn * amount,
      placed = if (amount > .82f) after.placed else before.placed,
      visible = before.visible || after.visible,
    )
  }

  private fun loadBitmap(value: String): Bitmap {
    val uri = Uri.parse(value)
    val stream = when (uri.scheme) {
      "content" -> context.contentResolver.openInputStream(uri)
      "file" -> if (value.startsWith("file:///android_res/")) {
        openBundledImage(value, uri) ?: error("Unable to find bundled puzzle image")
      } else {
        FileInputStream(requireNotNull(uri.path))
      }
      "asset" -> openBundledImage(value, uri)
      "http", "https" -> URL(value).openStream()
      null, "" -> openBundledImage(value, uri) ?: FileInputStream(value)
      else -> openBundledImage(value, uri) ?: FileInputStream(value)
    } ?: error("Unable to read the puzzle image")
    val bytes = stream.use { it.readBytes() }
    val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: error("Unable to decode the puzzle image")
    val orientation = runCatching {
      ExifInterface(ByteArrayInputStream(bytes)).getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL,
      )
    }.getOrDefault(ExifInterface.ORIENTATION_NORMAL)
    val matrix = Matrix().apply {
      when (orientation) {
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> setScale(-1f, 1f)
        ExifInterface.ORIENTATION_ROTATE_180 -> setRotate(180f)
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> setScale(1f, -1f)
        ExifInterface.ORIENTATION_TRANSPOSE -> { setRotate(90f); postScale(-1f, 1f) }
        ExifInterface.ORIENTATION_ROTATE_90 -> setRotate(90f)
        ExifInterface.ORIENTATION_TRANSVERSE -> { setRotate(-90f); postScale(-1f, 1f) }
        ExifInterface.ORIENTATION_ROTATE_270 -> setRotate(-90f)
      }
    }
    if (orientation == ExifInterface.ORIENTATION_NORMAL || orientation == ExifInterface.ORIENTATION_UNDEFINED) return decoded
    return Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true).also {
      if (it !== decoded) decoded.recycle()
    }
  }

  private fun openBundledImage(value: String, uri: Uri): InputStream? {
    val rawName = uri.lastPathSegment
      ?: value.substringAfterLast('/')
    val resourceName = rawName
      .substringBefore('?')
      .substringBeforeLast('.')
      .replace(Regex("[^a-zA-Z0-9_]"), "_")
      .lowercase()
    for (type in listOf("drawable", "raw")) {
      val resourceId = context.resources.getIdentifier(resourceName, type, context.packageName)
      if (resourceId != 0) return context.resources.openRawResource(resourceId)
    }

    val assetPath = value
      .removePrefix("asset://")
      .removePrefix("asset:/")
      .removePrefix("/")
    return runCatching { context.assets.open(assetPath) }.getOrNull()
  }

  private fun draw(target: Bitmap, image: Bitmap, logo: Bitmap?, pieces: List<VideoPiece>, states: Map<String, VideoState>, rows: Int, columns: Int) {
    val canvas = Canvas(target)
    canvas.drawColor(Color.rgb(4, 10, 24))
    val cell = min(width.toFloat() / columns, height.toFloat() / rows)
    val boardW = columns * cell
    val boardH = rows * cell
    val ox = (width - boardW) / 2f
    val oy = (height - boardH) / 2f
    val imageDest = RectF(ox, oy, ox + boardW, oy + boardH)
    val imageSource = centerCropSource(image, boardW / boardH)
    pieces.sortedBy { if (states[it.id]?.placed == true) 0 else 1 }.forEach { piece ->
      val state = states[piece.id] ?: return@forEach
      if (!state.visible) return@forEach
      canvas.save()
      val px = ox + state.x * cell
      val py = oy + state.y * cell
      canvas.rotate(state.rotation, px + cell / 2, py + cell / 2)
      val path = piecePath(px, py, cell, piece.shape)
      canvas.save()
      canvas.clipPath(path)
      val translated = RectF(imageDest).apply { offset((state.x - piece.column) * cell, (state.y - piece.row) * cell) }
      canvas.drawBitmap(image, imageSource, translated, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
      canvas.restore()
      canvas.drawPath(path, Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = if (state.placed) 1f else 1.7f; color = if (state.placed) Color.argb(70,255,255,255) else Color.argb(190,255,255,255) })
      canvas.restore()
    }
    logo?.let {
      val logoSize = min(width, height) * .085f
      val margin = min(width, height) * .025f
      canvas.drawBitmap(
        it,
        null,
        RectF(width - margin - logoSize, margin, width - margin, margin + logoSize),
        Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply { alpha = 178 },
      )
    }
  }

  private fun centerCropSource(image: Bitmap, destinationAspect: Float): Rect {
    val sourceAspect = image.width.toFloat() / image.height.toFloat()
    return if (sourceAspect > destinationAspect) {
      val cropWidth = (image.height * destinationAspect).toInt().coerceAtLeast(1)
      val left = (image.width - cropWidth) / 2
      Rect(left, 0, left + cropWidth, image.height)
    } else {
      val cropHeight = (image.width / destinationAspect).toInt().coerceAtLeast(1)
      val top = (image.height - cropHeight) / 2
      Rect(0, top, image.width, top + cropHeight)
    }
  }

  private fun piecePath(x: Float, y: Float, size: Float, shape: JSONObject): Path {
    val path = Path(); val third = size / 3f; val depth = size * .2f
    path.moveTo(x, y)
    edge(path, x, y, x + size, y, shape.getString("top"), depth, 0f, -1f)
    edge(path, x + size, y, x + size, y + size, shape.getString("right"), depth, 1f, 0f)
    edge(path, x + size, y + size, x, y + size, shape.getString("bottom"), depth, 0f, 1f)
    edge(path, x, y + size, x, y, shape.getString("left"), depth, -1f, 0f)
    path.close(); return path
  }

  private fun edge(path: Path, sx: Float, sy: Float, ex: Float, ey: Float, type: String, depth: Float, nx: Float, ny: Float) {
    if (type == "flat") { path.lineTo(ex, ey); return }
    val dx = ex - sx; val dy = ey - sy; val sign = if (type == "tab") 1f else -1f
    path.lineTo(sx + dx/3, sy + dy/3)
    val mx = sx + dx/2; val my = sy + dy/2; val ox = nx * depth * sign; val oy = ny * depth * sign
    path.cubicTo(sx+dx*.38f,sy+dy*.38f,mx+ox*.62f,my+oy*.62f,mx+ox,my+oy)
    path.cubicTo(mx+ox*.62f,my+oy*.62f,sx+dx*.62f,sy+dy*.62f,sx+dx*2/3,sy+dy*2/3)
    path.lineTo(ex, ey)
  }

  private fun encodeFrames(file: File, totalFrames: Int, render: (Int, Bitmap) -> Unit) {
    val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
    val supportedFormats = codec.codecInfo
      .getCapabilitiesForType(MediaFormat.MIMETYPE_VIDEO_AVC)
      .colorFormats
      .toSet()
    val qcomSemiPlanar = 0x7FA30C00
    val colorFormat = when {
      MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar in supportedFormats ->
        MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar
      qcomSemiPlanar in supportedFormats -> qcomSemiPlanar
      MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Planar in supportedFormats ->
        MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Planar
      MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible in supportedFormats ->
        MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible
      else -> error("The device video encoder does not support YUV 4:2:0 input")
    }
    val semiPlanar = colorFormat == MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar || colorFormat == qcomSemiPlanar
    val format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height).apply {
      setInteger(MediaFormat.KEY_COLOR_FORMAT, colorFormat)
      setInteger(MediaFormat.KEY_COLOR_STANDARD, MediaFormat.COLOR_STANDARD_BT601_NTSC)
      setInteger(MediaFormat.KEY_COLOR_RANGE, MediaFormat.COLOR_RANGE_LIMITED)
      setInteger(MediaFormat.KEY_COLOR_TRANSFER, MediaFormat.COLOR_TRANSFER_SDR_VIDEO)
      setInteger(MediaFormat.KEY_BIT_RATE, 5_000_000); setInteger(MediaFormat.KEY_FRAME_RATE, fps); setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 2)
    }
    val muxer = MediaMuxer(file.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    var track = -1; var started = false
    val info = MediaCodec.BufferInfo(); val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val pixels = IntArray(width * height); val yuv = ByteArray(width * height * 3 / 2)
    codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE); codec.start()
    fun drain(end: Boolean) {
      while (true) {
        val index = codec.dequeueOutputBuffer(info, if (end) 10_000 else 0)
        if (index == MediaCodec.INFO_TRY_AGAIN_LATER) { if (!end) return else continue }
        if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) { track = muxer.addTrack(codec.outputFormat); muxer.start(); started = true; continue }
        if (index >= 0) {
          codec.getOutputBuffer(index)?.let { buffer -> if (info.size > 0 && started) { buffer.position(info.offset); buffer.limit(info.offset + info.size); muxer.writeSampleData(track, buffer, info) } }
          codec.releaseOutputBuffer(index, false)
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) return
        }
      }
    }
    fun nextInputBuffer(): Int {
      while (true) {
        val index = codec.dequeueInputBuffer(10_000)
        if (index >= 0) return index
      }
    }
    try {
      for (frame in 0 until totalFrames) {
        render(frame, bitmap)
        val input = nextInputBuffer()
        toYuv420(bitmap, pixels, yuv, semiPlanar)
        codec.getInputBuffer(input)!!.apply { clear(); put(yuv) }
        codec.queueInputBuffer(input, 0, width * height * 3 / 2, frame * 1_000_000L / fps, 0)
        drain(false)
      }
      val eos = nextInputBuffer()
      codec.queueInputBuffer(eos, 0, 0, totalFrames * 1_000_000L / fps, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
      drain(true)
    } finally {
      bitmap.recycle()
      runCatching { codec.stop() }; codec.release()
      if (started) runCatching { muxer.stop() }
      muxer.release()
    }
  }

  private fun toYuv420(bitmap: Bitmap, pixels: IntArray, result: ByteArray, semiPlanar: Boolean) {
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
    var yIndex = 0
    var uIndex = width * height
    var vIndex = uIndex + width * height / 4
    var chromaIndex = width * height
    for (row in 0 until height) for (col in 0 until width) {
      val color = pixels[row * width + col]; val r = Color.red(color); val g = Color.green(color); val b = Color.blue(color)
      result[yIndex++] = ((66*r + 129*g + 25*b + 128 shr 8) + 16).coerceIn(0,255).toByte()
      if (row % 2 == 0 && col % 2 == 0) {
        val u = ((-38*r - 74*g + 112*b + 128 shr 8) + 128).coerceIn(0,255).toByte()
        val v = ((112*r - 94*g - 18*b + 128 shr 8) + 128).coerceIn(0,255).toByte()
        if (semiPlanar) {
          result[chromaIndex++] = u
          result[chromaIndex++] = v
        } else {
          result[uIndex++] = u
          result[vIndex++] = v
        }
      }
    }
  }
}
