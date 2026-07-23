package app.perazzo.piecefulgames

import android.content.Context
import android.graphics.*
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.net.URL
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

private data class VideoState(val id: String, val x: Float, val y: Float, val rotation: Float, val placed: Boolean, val visible: Boolean)
private data class VideoFrame(val at: Double, val changes: List<VideoState>)
private data class VideoPiece(val id: String, val row: Int, val column: Int, val shape: JSONObject)

internal class PiecefulTimelapseEncoder(private val context: Context) {
  private val width = 720
  private val height = 1280
  private val fps = 24
  private val speed = 60.0

  fun encode(payload: JSONObject, onProgress: (Int) -> Unit): String {
    val source = loadBitmap(payload.getString("imageUri"))
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
    val elapsed = max(1.0, payload.optDouble("elapsed", 1.0))
    val sourceDuration = max(elapsed, frames.lastOrNull()?.at ?: 0.0)
    val totalFrames = max(2, ceil(sourceDuration / speed * fps).toInt())
    val output = File(context.cacheDir, "pieceful-${System.currentTimeMillis()}.mp4")
    encodeFrames(output, totalFrames) { frameIndex, bitmap ->
      val sourceTime = sourceDuration * frameIndex / (totalFrames - 1).toDouble()
      states.clear(); initial.forEach { states[it.id] = it }
      var applied = -1
      frames.forEachIndexed { index, frame -> if (frame.at <= sourceTime) { frame.changes.forEach { states[it.id] = it }; applied = index } }
      val next = frames.getOrNull(applied + 1)
      if (next != null && frameIndex < totalFrames - 1) {
        val previousTime = if (applied >= 0) frames[applied].at else 0.0
        val amount = ((sourceTime - previousTime) / max(0.001, next.at - previousTime)).coerceIn(0.0, 1.0).toFloat()
        next.changes.forEach { after ->
          val before = states[after.id]
          if (before != null) states[after.id] = interpolate(before, after, amount)
        }
      }
      if (frameIndex == totalFrames - 1) {
        piecesJson.let { array -> (0 until array.length()).forEach { index ->
          val item = array.getJSONObject(index)
          val correct = item.getJSONObject("correctPosition")
          states[item.getString("id")] = VideoState(item.getString("id"), correct.getDouble("x").toFloat(), correct.getDouble("y").toFloat(), correct.getDouble("rotation").toFloat(), true, true)
        }}
      }
      draw(bitmap, source, pieces, states, rows, columns, payload.optString("language", "pt-BR"), elapsed, frameIndex / (totalFrames - 1f))
      onProgress(((frameIndex + 1) * 100f / totalFrames).toInt())
    }
    source.recycle()
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
      "file" -> FileInputStream(requireNotNull(uri.path))
      "http", "https" -> URL(value).openStream()
      else -> FileInputStream(value)
    } ?: error("Unable to read the puzzle image")
    return stream.use { BitmapFactory.decodeStream(it) } ?: error("Unable to decode the puzzle image")
  }

  private fun draw(target: Bitmap, image: Bitmap, pieces: List<VideoPiece>, states: Map<String, VideoState>, rows: Int, columns: Int, language: String, elapsed: Double, progress: Float) {
    val canvas = Canvas(target)
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), Paint().apply { shader = LinearGradient(0f, 0f, width.toFloat(), height.toFloat(), intArrayOf(Color.rgb(9,17,37), Color.rgb(23,27,54), Color.rgb(37,24,61)), null, Shader.TileMode.CLAMP) })
    fun text(value: String, y: Float, size: Float, color: Int, bold: Boolean = false) = canvas.drawText(value, width / 2f, y, Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color; textSize = size; textAlign = Paint.Align.CENTER; typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT })
    text("PIECEFUL", 66f, 22f, Color.rgb(76,215,246), true)
    text(if (language == "en") "A memory, piece by piece" else "Uma memória, peça por peça", 122f, 40f, Color.WHITE, true)
    text(if (language == "en") "ASSEMBLY TIMELAPSE" else "TIMELAPSE DA MONTAGEM", 158f, 19f, Color.rgb(158,168,197))
    val cell = min(620f / columns, 760f / rows)
    val boardW = columns * cell
    val boardH = rows * cell
    val ox = (width - boardW) / 2f
    val oy = 218f + (760f - boardH) / 2f
    canvas.drawRoundRect(ox - 14, oy - 14, ox + boardW + 14, oy + boardH + 14, 22f, 22f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(185,4,10,24) })
    val imageDest = RectF(ox, oy, ox + boardW, oy + boardH)
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
      canvas.drawBitmap(image, null, translated, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
      canvas.restore()
      canvas.drawPath(path, Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = if (state.placed) 1f else 1.7f; color = if (state.placed) Color.argb(70,255,255,255) else Color.argb(190,255,255,255) })
      canvas.restore()
    }
    val placed = if (progress >= 1f) pieces.size else states.values.count { it.placed }
    canvas.drawRoundRect(52f, 1040f, width - 52f, 1172f, 28f, 28f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(205,7,13,31) })
    val label = "${(placed * 100f / pieces.size).toInt()}% ${if (language == "en") "completed" else "concluído"}"
    canvas.drawText(label, 82f, 1093f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = 34f; typeface = Typeface.DEFAULT_BOLD })
    canvas.drawText(if (language == "en") "$placed of ${pieces.size} pieces" else "$placed de ${pieces.size} peças", 82f, 1128f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(158,168,197); textSize = 18f })
    val seconds = (elapsed * progress).toInt(); val time = "%02d:%02d:%02d".format(seconds / 3600, seconds / 60 % 60, seconds % 60)
    canvas.drawText(time, width - 82f, 1111f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(76,215,246); textSize = 26f; typeface = Typeface.DEFAULT_BOLD; textAlign = Paint.Align.RIGHT })
    canvas.drawRect(52f,1204f,width-52f,1214f,Paint().apply { color=Color.argb(25,255,255,255) })
    canvas.drawRect(52f,1204f,52f+(width-104f)*progress,1214f,Paint().apply { color=Color.rgb(76,215,246) })
    text(if (language == "en") "Created with Pieceful" else "Criado com Pieceful", 1250f, 16f, Color.rgb(217,221,245), true)
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
    val format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height).apply {
      setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
      setInteger(MediaFormat.KEY_BIT_RATE, 5_000_000); setInteger(MediaFormat.KEY_FRAME_RATE, fps); setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 2)
    }
    val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
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
        toI420(bitmap, pixels, yuv)
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

  private fun toI420(bitmap: Bitmap, pixels: IntArray, result: ByteArray) {
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
    var yIndex = 0; var uIndex = width * height; var vIndex = uIndex + width * height / 4
    for (row in 0 until height) for (col in 0 until width) {
      val color = pixels[row * width + col]; val r = Color.red(color); val g = Color.green(color); val b = Color.blue(color)
      result[yIndex++] = ((66*r + 129*g + 25*b + 128 shr 8) + 16).coerceIn(0,255).toByte()
      if (row % 2 == 0 && col % 2 == 0) {
        result[uIndex++] = ((-38*r - 74*g + 112*b + 128 shr 8) + 128).coerceIn(0,255).toByte()
        result[vIndex++] = ((112*r - 94*g - 18*b + 128 shr 8) + 128).coerceIn(0,255).toByte()
      }
    }
  }
}
