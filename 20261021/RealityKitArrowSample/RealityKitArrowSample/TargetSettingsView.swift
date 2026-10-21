import SwiftUI

/// 目的地の緯度経度を設定する画面。
struct TargetSettingsView: View {
    @Binding var latitude: Double
    @Binding var longitude: Double

    @Environment(\.dismiss) private var dismiss

    private struct Preset: Identifiable {
        let name: String
        let latitude: Double
        let longitude: Double
        var id: String { name }
    }

    private let presets: [Preset] = [
        Preset(name: "東京タワー", latitude: 35.658584, longitude: 139.745433),
        Preset(name: "富士山", latitude: 35.360556, longitude: 138.727778),
        Preset(name: "大阪城", latitude: 34.687315, longitude: 135.526201),
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    LabeledContent("緯度") {
                        coordinateField("緯度", value: $latitude, range: -90...90)
                    }
                    LabeledContent("経度") {
                        coordinateField("経度", value: $longitude, range: -180...180)
                    }
                } header: {
                    Text("目的地")
                } footer: {
                    Text("緯度は -90〜90、経度は -180〜180 の範囲で入力してください。")
                }

                Section("プリセット") {
                    ForEach(presets) { preset in
                        Button(preset.name) {
                            latitude = preset.latitude
                            longitude = preset.longitude
                        }
                    }
                }
            }
            .navigationTitle("目的地の設定")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完了") { dismiss() }
                }
            }
        }
    }

    private func coordinateField(
        _ title: LocalizedStringKey,
        value: Binding<Double>,
        range: ClosedRange<Double>
    ) -> some View {
        TextField(title, value: value, format: .number.precision(.fractionLength(0...6)))
            .multilineTextAlignment(.trailing)
            .keyboardType(.numbersAndPunctuation)
            .onChange(of: value.wrappedValue) { _, newValue in
                let clamped = min(max(newValue, range.lowerBound), range.upperBound)
                if clamped != newValue {
                    value.wrappedValue = clamped
                }
            }
    }
}

#Preview {
    @Previewable @State var latitude = 35.658584
    @Previewable @State var longitude = 139.745433
    TargetSettingsView(latitude: $latitude, longitude: $longitude)
}
