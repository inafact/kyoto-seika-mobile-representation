import CoreLocation

enum GeoMath {
    /// `from` から `to` への方位角を、真北から時計回りのラジアンで返す（0..<2π）。
    static func bearing(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> Double {
        let lat1 = from.latitude * .pi / 180
        let lat2 = to.latitude * .pi / 180
        let deltaLon = (to.longitude - from.longitude) * .pi / 180

        let y = sin(deltaLon) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(deltaLon)
        let bearing = atan2(y, x)
        return bearing >= 0 ? bearing : bearing + 2 * .pi
    }
}
