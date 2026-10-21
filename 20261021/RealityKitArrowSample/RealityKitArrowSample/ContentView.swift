import SwiftUI
import CoreLocation

struct ContentView: View {
    @AppStorage("targetLatitude") private var targetLatitude = 35.658584
    @AppStorage("targetLongitude") private var targetLongitude = 139.745433

    @State private var locationProvider = LocationProvider()
    @State private var isShowingSettings = false

    private var target: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: targetLatitude, longitude: targetLongitude)
    }

    /// 現在地から目的地への方位角（真北から時計回りのラジアン）
    private var bearing: Double? {
        locationProvider.location.map { GeoMath.bearing(from: $0.coordinate, to: target) }
    }

    private var distance: CLLocationDistance? {
        locationProvider.location?.distance(
            from: CLLocation(latitude: targetLatitude, longitude: targetLongitude)
        )
    }

    var body: some View {
        arContent
            .ignoresSafeArea()
            .overlay(alignment: .top) {
                statusPanel
                    .padding()
            }
            .overlay(alignment: .bottomTrailing) {
                Button("目的地を設定", systemImage: "mappin.and.ellipse") {
                    isShowingSettings = true
                }
                .labelStyle(.iconOnly)
                .font(.title2)
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.circle)
                .controlSize(.large)
                .padding()
            }
            .sheet(isPresented: $isShowingSettings) {
                TargetSettingsView(latitude: $targetLatitude, longitude: $targetLongitude)
            }
            .onAppear { locationProvider.start() }
            .onDisappear { locationProvider.stop() }
    }

    @ViewBuilder
    private var arContent: some View {
        if ARArrowView.isSupported {
            ARArrowView(bearing: bearing)
        } else {
            unsupportedView
        }
    }

    private var unsupportedView: some View {
        ContentUnavailableView(
            "AR に対応していません",
            systemImage: "arkit",
            description: Text("ARKit に対応した iPhone / iPad の実機で実行してください。")
        )
    }

    private var statusPanel: some View {
        VStack(spacing: 4) {
            Text("目的地 \(targetLatitude, format: .number.precision(.fractionLength(5))), \(targetLongitude, format: .number.precision(.fractionLength(5)))")
                .font(.caption)
                .foregroundStyle(.secondary)

            if locationProvider.isAuthorizationDenied {
                Text("位置情報の利用が許可されていません")
                    .font(.headline)
            } else if let bearing, let distance {
                Text(Measurement(value: distance, unit: UnitLength.meters),
                     format: .measurement(width: .abbreviated, usage: .road))
                    .font(.title.bold())
                    .monospacedDigit()
                Text("方位 \(Int((bearing * 180 / .pi).rounded()) % 360)°")
                    .font(.subheadline)
                    .monospacedDigit()
            } else {
                Label("現在地を取得中…", systemImage: "location")
                    .font(.headline)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial, in: .rect(cornerRadius: 16))
    }
}

#Preview {
    ContentView()
}
