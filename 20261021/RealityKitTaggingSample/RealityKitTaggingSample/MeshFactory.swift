import ARKit
import RealityKit

enum MeshFactory {
    /// 平面のローカル座標（XZ 平面、法線 +Y）上に、円を並べたブラシの跡のメッシュを作る。
    /// - Parameters:
    ///   - centers: 円の中心（ローカル座標の x, z）
    ///   - radius: 円の半径（メートル）
    ///   - height: 平面からの高さ（重なりのちらつきを防ぐためのオフセット）
    static func brushStamps(
        centers: [SIMD2<Float>],
        radius: Float,
        height: Float,
        segments: Int = 16
    ) throws -> MeshResource {
        let rim = (0..<segments).map { index -> SIMD2<Float> in
            let angle = Float(index) / Float(segments) * 2 * .pi
            return SIMD2(cos(angle), sin(angle)) * radius
        }

        var positions: [SIMD3<Float>] = []
        var indices: [UInt32] = []
        positions.reserveCapacity(centers.count * (segments + 1))
        indices.reserveCapacity(centers.count * segments * 3)

        for center in centers {
            let base = UInt32(positions.count)
            positions.append(SIMD3(center.x, height, center.y))
            for offset in rim {
                positions.append(SIMD3(center.x + offset.x, height, center.y + offset.y))
            }
            // 上（+Y）から見て反時計回りになる順で三角形を並べる
            for index in 0..<UInt32(segments) {
                let next = (index + 1) % UInt32(segments)
                indices += [base, base + 1 + next, base + 1 + index]
            }
        }

        var descriptor = MeshDescriptor(name: "brushStroke")
        descriptor.positions = MeshBuffers.Positions(positions)
        descriptor.normals = MeshBuffers.Normals(Array(repeating: SIMD3<Float>(0, 1, 0), count: positions.count))
        descriptor.primitives = .triangles(indices)
        return try MeshResource.generate(from: [descriptor])
    }

    /// ARKit が推定した平面の形からメッシュを作る。
    static func plane(_ geometry: ARPlaneGeometry) throws -> MeshResource {
        var descriptor = MeshDescriptor(name: "plane")
        descriptor.positions = MeshBuffers.Positions(geometry.vertices)
        descriptor.primitives = .triangles(geometry.triangleIndices.map { UInt32($0) })
        return try MeshResource.generate(from: [descriptor])
    }
}
