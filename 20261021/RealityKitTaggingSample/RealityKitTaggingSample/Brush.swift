import SwiftUI
import UIKit

/// 塗る色。
enum PaintColor: String, CaseIterable, Identifiable {
    case red, orange, yellow, green, blue, purple, white, black

    var id: Self { self }

    var uiColor: UIColor {
        switch self {
        case .red: .systemRed
        case .orange: .systemOrange
        case .yellow: .systemYellow
        case .green: .systemGreen
        case .blue: .systemBlue
        case .purple: .systemPurple
        case .white: .white
        case .black: .black
        }
    }

    var color: Color { Color(uiColor: uiColor) }

    var name: LocalizedStringResource {
        switch self {
        case .red: "赤"
        case .orange: "オレンジ"
        case .yellow: "黄"
        case .green: "緑"
        case .blue: "青"
        case .purple: "紫"
        case .white: "白"
        case .black: "黒"
        }
    }
}

/// ブラシの太さ。
enum BrushSize: CaseIterable, Identifiable {
    case small, medium, large

    var id: Self { self }

    /// ブラシの半径（メートル）
    var radius: Float {
        switch self {
        case .small: 0.005
        case .medium: 0.012
        case .large: 0.025
        }
    }

    var title: LocalizedStringResource {
        switch self {
        case .small: "細"
        case .medium: "中"
        case .large: "太"
        }
    }
}
