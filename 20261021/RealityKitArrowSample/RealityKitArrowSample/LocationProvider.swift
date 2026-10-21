import CoreLocation
import Observation

/// 現在地を継続的に取得する。
@Observable
final class LocationProvider {
    private(set) var location: CLLocation?
    private(set) var isAuthorizationDenied = false

    private var session: CLServiceSession?
    private var updatesTask: Task<Void, Never>?

    func start() {
        guard updatesTask == nil else { return }
        session = CLServiceSession(authorization: .whenInUse)
        updatesTask = Task {
            do {
                for try await update in CLLocationUpdate.liveUpdates(.otherNavigation) {
                    isAuthorizationDenied = update.authorizationDenied || update.authorizationDeniedGlobally
                    if let location = update.location {
                        self.location = location
                    }
                }
            } catch {
                // キャンセル時などはそのまま終了する
            }
        }
    }

    func stop() {
        updatesTask?.cancel()
        updatesTask = nil
        session?.invalidate()
        session = nil
    }
}
