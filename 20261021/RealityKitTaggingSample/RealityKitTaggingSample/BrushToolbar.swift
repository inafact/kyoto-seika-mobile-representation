import SwiftUI

/// 色・太さの選択と、取り消し・全消去などの操作パネル。
struct BrushToolbar: View {
    @Bindable var canvas: PaintCanvas

    @State private var isConfirmingClear = false

    var body: some View {
        VStack(spacing: 12) {
            colorPalette

            HStack(spacing: 12) {
                Picker("太さ", selection: $canvas.brushSize) {
                    ForEach(BrushSize.allCases) { size in
                        Text(size.title).tag(size)
                    }
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 160)

                Spacer()

                Toggle("平面を表示", systemImage: "square.grid.3x3", isOn: $canvas.showsPlanes)
                    .toggleStyle(.button)
                    .labelStyle(.iconOnly)

                Button("1 つ戻す", systemImage: "arrow.uturn.backward") {
                    canvas.undo()
                }
                .labelStyle(.iconOnly)
                .disabled(canvas.strokeCount == 0)

                Button("すべて消す", systemImage: "trash", role: .destructive) {
                    isConfirmingClear = true
                }
                .labelStyle(.iconOnly)
                .disabled(canvas.strokeCount == 0)
                .confirmationDialog("塗った線をすべて消しますか？", isPresented: $isConfirmingClear, titleVisibility: .visible) {
                    Button("すべて消す", role: .destructive) {
                        canvas.clear()
                    }
                }
            }
            .font(.title3)
        }
        .padding(16)
        .background(.regularMaterial, in: .rect(cornerRadius: 20))
    }

    private var colorPalette: some View {
        HStack(spacing: 10) {
            ForEach(PaintColor.allCases) { paintColor in
                Button {
                    canvas.paintColor = paintColor
                } label: {
                    Circle()
                        .fill(paintColor.color)
                        .frame(width: 32, height: 32)
                        .overlay {
                            Circle().strokeBorder(.secondary, lineWidth: 1)
                        }
                        .padding(3)
                        .overlay {
                            if canvas.paintColor == paintColor {
                                Circle().strokeBorder(.primary, lineWidth: 2.5)
                            }
                        }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text(paintColor.name))
                .accessibilityAddTraits(canvas.paintColor == paintColor ? .isSelected : [])
            }
        }
    }
}
