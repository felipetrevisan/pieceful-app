import AVFoundation
import UIKit

private struct TState {
  let id: String; let x: CGFloat; let y: CGFloat; let rotation: CGFloat; let placed: Bool; let visible: Bool
}
private struct TFrame { let at: Double; let changes: [TState] }
private struct TPiece { let id: String; let row: Int; let column: Int; let shape: [String: Any]; let correct: [String: Any] }

final class PiecefulTimelapseEncoder {
  private var size = CGSize(width: 720, height: 1280)
  private let fps: Int32 = 24

  func encode(payload: String, progress: @escaping (Int) -> Void) throws -> String {
    guard let data = payload.data(using: .utf8),
          let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          let imageUri = root["imageUri"] as? String,
          let image = loadImage(imageUri),
          let pieceData = root["pieces"] as? [[String: Any]],
          let timeline = root["timelapse"] as? [String: Any] else { throw videoError("Invalid timelapse data") }
    let pieces = pieceData.compactMap { item -> TPiece? in
      guard let id = item["id"] as? String, let shape = item["shape"] as? [String: Any], let correct = item["correctPosition"] as? [String: Any] else { return nil }
      return TPiece(id: id, row: number(item["row"]), column: number(item["column"]), shape: shape, correct: correct)
    }
    let initialData = timeline["initial"] as? [[String: Any]] ?? []
    let initial = initialData.compactMap(state)
    let frames = (timeline["frames"] as? [[String: Any]] ?? []).map { item in
      TFrame(at: double(item["at"]), changes: (item["changes"] as? [[String: Any]] ?? []).compactMap(state))
    }.sorted { $0.at < $1.at }
    let rows = number(root["rows"]), columns = number(root["columns"])
    let boardScale = max(1, (1280 / max(rows, columns)) / 16) * 16
    size = CGSize(width: CGFloat(columns * boardScale), height: CGFloat(rows * boardScale))
    let logo = (root["logoUri"] as? String).flatMap { loadImage($0) }
    let elapsed = max(1, double(root["elapsed"])); let sourceStart = frames.first?.at ?? 0
    let sourceEnd = max(sourceStart + 0.12, frames.last?.at ?? elapsed)
    let sourceDuration = max(0.12, sourceEnd - sourceStart)
    let assemblyFrames = max(2, Int(ceil(sourceDuration / 60 * Double(fps))))
    let totalFrames = assemblyFrames + Int(fps)
    let output = FileManager.default.temporaryDirectory.appendingPathComponent("pieceful-\(Int(Date().timeIntervalSince1970 * 1000)).mp4")
    try? FileManager.default.removeItem(at: output)
    let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: size.width,
      AVVideoHeightKey: size.height,
      AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 5_000_000, AVVideoMaxKeyFrameIntervalKey: 48]
    ])
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      kCVPixelBufferWidthKey as String: Int(size.width),
      kCVPixelBufferHeightKey as String: Int(size.height)
    ])
    guard writer.canAdd(input) else { throw videoError("Unable to configure the video encoder") }
    writer.add(input); guard writer.startWriting() else { throw writer.error ?? videoError("Unable to start video encoding") }
    defer { if writer.status == .writing { writer.cancelWriting() } }
    writer.startSession(atSourceTime: .zero)
    var states = Dictionary(uniqueKeysWithValues: initial.map { ($0.id, $0) })
    for frameIndex in 0..<totalFrames {
      while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.004) }
      let assemblyIndex = min(frameIndex, assemblyFrames - 1)
      let sourceTime = sourceStart + sourceDuration * Double(assemblyIndex) / Double(assemblyFrames - 1)
      states = Dictionary(uniqueKeysWithValues: initial.map { ($0.id, $0) })
      var applied = -1
      for (index, frame) in frames.enumerated() where frame.at <= sourceTime { for change in frame.changes { states[change.id] = change }; applied = index }
      if frameIndex < assemblyFrames - 1, frames.indices.contains(applied + 1) {
        let next = frames[applied + 1], previousTime = applied >= 0 ? frames[applied].at : 0
        let amount = CGFloat(min(1, max(0, (sourceTime - previousTime) / max(0.001, next.at - previousTime))))
        for after in next.changes { if let before = states[after.id] { states[after.id] = interpolate(before, after, amount) } }
      }
      if frameIndex >= assemblyFrames - 1 {
        for piece in pieces { states[piece.id] = TState(id: piece.id, x: cg(piece.correct["x"]), y: cg(piece.correct["y"]), rotation: cg(piece.correct["rotation"]), placed: true, visible: true) }
      }
      guard let pool = adaptor.pixelBufferPool, let buffer = makeBuffer(pool: pool, image: render(image: image, logo: logo, pieces: pieces, states: states, rows: rows, columns: columns)) else { throw videoError("Unable to render a video frame") }
      guard adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(frameIndex), timescale: fps)) else { throw writer.error ?? videoError("Unable to append a video frame") }
      progress(Int(Double(frameIndex + 1) / Double(totalFrames) * 100))
    }
    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0); var finishError: Error?
    writer.finishWriting { finishError = writer.error; semaphore.signal() }
    semaphore.wait(); if let finishError { throw finishError }
    return output.absoluteString
  }

  private func loadImage(_ value: String) -> UIImage? {
    if value.hasPrefix("file://"), let url = URL(string: value), let data = try? Data(contentsOf: url) { return UIImage(data: data) }
    if (value.hasPrefix("https://") || value.hasPrefix("http://")), let url = URL(string: value), let data = try? Data(contentsOf: url) { return UIImage(data: data) }
    if let data = try? Data(contentsOf: URL(fileURLWithPath: value)) { return UIImage(data: data) }
    return nil
  }

  private func render(image: UIImage, logo: UIImage?, pieces: [TPiece], states: [String: TState], rows: Int, columns: Int) -> UIImage {
    UIGraphicsImageRenderer(size: size).image { context in
      let cg = context.cgContext
      UIColor(red: 0.016, green: 0.04, blue: 0.094, alpha: 1).setFill()
      cg.fill(CGRect(origin: .zero, size: size))
      let cell = min(size.width / CGFloat(columns), size.height / CGFloat(rows)); let boardW = CGFloat(columns) * cell; let boardH = CGFloat(rows) * cell
      let ox = (size.width - boardW) / 2, oy = (size.height - boardH) / 2
      let imageScale = max(boardW / image.size.width, boardH / image.size.height)
      let imageWidth = image.size.width * imageScale, imageHeight = image.size.height * imageScale
      let imageRect = CGRect(x: ox + (boardW - imageWidth) / 2, y: oy + (boardH - imageHeight) / 2, width: imageWidth, height: imageHeight)
      for piece in pieces.sorted(by: { (states[$0.id]?.placed == true ? 0 : 1) < (states[$1.id]?.placed == true ? 0 : 1) }) {
        guard let s = states[piece.id], s.visible else { continue }
        cg.saveGState(); let px = ox + s.x * cell, py = oy + s.y * cell
        cg.translateBy(x: px + cell/2, y: py + cell/2); cg.rotate(by: s.rotation * .pi / 180); cg.translateBy(x: -(px + cell/2), y: -(py + cell/2))
        let path = piecePath(x: px, y: py, size: cell, shape: piece.shape); path.addClip()
        image.draw(in: imageRect.offsetBy(dx: (s.x - CGFloat(piece.column))*cell, dy: (s.y - CGFloat(piece.row))*cell))
        (s.placed ? UIColor.white.withAlphaComponent(0.25) : UIColor.white.withAlphaComponent(0.75)).setStroke(); path.lineWidth = s.placed ? 1 : 1.7; path.stroke(); cg.restoreGState()
      }
      if let logo {
        let logoSize = min(size.width, size.height) * 0.085
        let margin = min(size.width, size.height) * 0.025
        logo.draw(in: CGRect(x: size.width - margin - logoSize, y: margin, width: logoSize, height: logoSize), blendMode: .normal, alpha: 0.7)
      }
    }
  }

  private func piecePath(x: CGFloat, y: CGFloat, size: CGFloat, shape: [String: Any]) -> UIBezierPath {
    let p = UIBezierPath(); p.move(to: CGPoint(x:x,y:y)); edge(p,CGPoint(x:x,y:y),CGPoint(x:x+size,y:y),shape["top"] as? String ?? "flat",size*.2,CGPoint(x:0,y:-1)); edge(p,CGPoint(x:x+size,y:y),CGPoint(x:x+size,y:y+size),shape["right"] as? String ?? "flat",size*.2,CGPoint(x:1,y:0)); edge(p,CGPoint(x:x+size,y:y+size),CGPoint(x:x,y:y+size),shape["bottom"] as? String ?? "flat",size*.2,CGPoint(x:0,y:1)); edge(p,CGPoint(x:x,y:y+size),CGPoint(x:x,y:y),shape["left"] as? String ?? "flat",size*.2,CGPoint(x:-1,y:0)); p.close(); return p
  }
  private func edge(_ p:UIBezierPath,_ a:CGPoint,_ b:CGPoint,_ type:String,_ depth:CGFloat,_ normal:CGPoint) { if type == "flat" { p.addLine(to:b); return }; let dx=b.x-a.x,dy=b.y-a.y,sign:CGFloat=type == "tab" ? 1:-1,mid=CGPoint(x:a.x+dx/2,y:a.y+dy/2),off=CGPoint(x:normal.x*depth*sign,y:normal.y*depth*sign); p.addLine(to:CGPoint(x:a.x+dx/3,y:a.y+dy/3)); p.addCurve(to:CGPoint(x:mid.x+off.x,y:mid.y+off.y),controlPoint1:CGPoint(x:a.x+dx*.38,y:a.y+dy*.38),controlPoint2:CGPoint(x:mid.x+off.x*.62,y:mid.y+off.y*.62)); p.addCurve(to:CGPoint(x:a.x+dx*2/3,y:a.y+dy*2/3),controlPoint1:CGPoint(x:mid.x+off.x*.62,y:mid.y+off.y*.62),controlPoint2:CGPoint(x:a.x+dx*.62,y:a.y+dy*.62)); p.addLine(to:b) }
  private func makeBuffer(pool: CVPixelBufferPool, image: UIImage) -> CVPixelBuffer? { var buffer:CVPixelBuffer?; guard CVPixelBufferPoolCreatePixelBuffer(nil,pool,&buffer)==kCVReturnSuccess,let b=buffer else{return nil}; CVPixelBufferLockBaseAddress(b,[]); defer{CVPixelBufferUnlockBaseAddress(b,[])}; guard let ctx=CGContext(data:CVPixelBufferGetBaseAddress(b),width:Int(size.width),height:Int(size.height),bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(b),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGBitmapInfo.byteOrder32Little.rawValue|CGImageAlphaInfo.premultipliedFirst.rawValue),let cg=image.cgImage else{return nil}; ctx.translateBy(x:0,y:size.height);ctx.scaleBy(x:1,y:-1);ctx.draw(cg,in:CGRect(origin:.zero,size:size));return b }
  private func state(_ item:[String:Any])->TState?{guard let id=item["id"] as? String else{return nil};return TState(id:id,x:cg(item["x"]),y:cg(item["y"]),rotation:cg(item["rotation"]),placed:item["isPlaced"] as? Bool ?? false,visible:item["visible"] as? Bool ?? false)}
  private func interpolate(_ before:TState,_ after:TState,_ amount:CGFloat)->TState{let turn=(after.rotation-before.rotation+540).truncatingRemainder(dividingBy:360)-180;return TState(id:after.id,x:before.x+(after.x-before.x)*amount,y:before.y+(after.y-before.y)*amount,rotation:before.rotation+turn*amount,placed:amount>0.82 ? after.placed:before.placed,visible:before.visible||after.visible)}
  private func number(_ value:Any?)->Int{(value as? NSNumber)?.intValue ?? 0}; private func double(_ value:Any?)->Double{(value as? NSNumber)?.doubleValue ?? 0}; private func cg(_ value:Any?)->CGFloat{CGFloat(double(value))}
  private func drawText(_ text:String,at p:CGPoint,size:CGFloat,color:UIColor,bold:Bool=false){let font=bold ? UIFont.boldSystemFont(ofSize:size):UIFont.systemFont(ofSize:size);let attrs:[NSAttributedString.Key:Any]=[.font:font,.foregroundColor:color];let s=(text as NSString).size(withAttributes:attrs);(text as NSString).draw(at:CGPoint(x:p.x-s.width/2,y:p.y),withAttributes:attrs)}
  private func drawLeft(_ text:String,x:CGFloat,y:CGFloat,size:CGFloat,color:UIColor,bold:Bool=false){(text as NSString).draw(at:CGPoint(x:x,y:y),withAttributes:[.font:bold ? UIFont.boldSystemFont(ofSize:size):UIFont.systemFont(ofSize:size),.foregroundColor:color])}
  private func drawRight(_ text:String,x:CGFloat,y:CGFloat,size:CGFloat,color:UIColor,bold:Bool=false){let attrs:[NSAttributedString.Key:Any]=[.font:bold ? UIFont.boldSystemFont(ofSize:size):UIFont.systemFont(ofSize:size),.foregroundColor:color];let w=(text as NSString).size(withAttributes:attrs).width;(text as NSString).draw(at:CGPoint(x:x-w,y:y),withAttributes:attrs)}
  private func videoError(_ message:String)->NSError{NSError(domain:"PiecefulTimelapse",code:1,userInfo:[NSLocalizedDescriptionKey:message])}
}
