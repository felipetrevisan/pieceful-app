import ExpoModulesCore
import GameKit
import UIKit
import AVFoundation

private final class PiecefulGameCenterDelegate: NSObject, GKGameCenterControllerDelegate {
  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
  }
}

public class PiecefulGameServicesModule: Module {
  private let gameCenterDelegate = PiecefulGameCenterDelegate()

  public func definition() -> ModuleDefinition {
    Name("PiecefulGameServices")
    Events("onTimelapseProgress")

    AsyncFunction("authenticate") { (promise: Promise) in
      GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
        if let viewController {
          self?.appContext?.utilities?.currentViewController()?.present(viewController, animated: true)
          return
        }
        if let error {
          promise.reject("ERR_GAME_CENTER_AUTH", error.localizedDescription)
          return
        }
        promise.resolve([
          "authenticated": GKLocalPlayer.local.isAuthenticated,
          "playerName": GKLocalPlayer.local.displayName,
          "playerId": GKLocalPlayer.local.gamePlayerID
        ])
      }
    }.runOnQueue(.main)

    AsyncFunction("reportAchievement") { (identifier: String, percent: Double, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.reject("ERR_GAME_CENTER_NOT_AUTHENTICATED", "Game Center player is not authenticated")
        return
      }
      let achievement = GKAchievement(identifier: identifier)
      achievement.percentComplete = min(100, max(0, percent))
      achievement.showsCompletionBanner = percent >= 100
      GKAchievement.report([achievement]) { error in
        if let error {
          promise.reject("ERR_GAME_CENTER_REPORT", error.localizedDescription)
        } else {
          promise.resolve(nil)
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("showAchievements") { (promise: Promise) in
      guard let currentViewController = self.appContext?.utilities?.currentViewController() else {
        promise.reject("ERR_NO_VIEW_CONTROLLER", "Unable to present Game Center")
        return
      }
      let controller = GKGameCenterViewController(state: .achievements)
      controller.gameCenterDelegate = gameCenterDelegate
      currentViewController.present(controller, animated: true) {
        promise.resolve(nil)
      }
    }.runOnQueue(.main)

    AsyncFunction("createTimelapse") { (payload: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let encoder = PiecefulTimelapseEncoder()
          let uri = try encoder.encode(payload: payload) { progress in
            self.sendEvent("onTimelapseProgress", ["progress": progress])
          }
          promise.resolve(uri)
        } catch {
          promise.reject("ERR_TIMELAPSE", error.localizedDescription)
        }
      }
    }
  }
}
