package app.perazzo.piecefulgames

import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PiecefulGameServicesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PiecefulGameServices")

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
  }
}
