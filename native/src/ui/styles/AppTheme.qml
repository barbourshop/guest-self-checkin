pragma Singleton
import QtQuick

// App theme singleton
QtObject {
    id: theme
    
    // Colors
    readonly property color primary: "#2196F3"
    readonly property color primaryDark: "#1976D2"
    readonly property color accent: "#4CAF50"
    readonly property color error: "#F44336"
    readonly property color warning: "#FF9800"
    readonly property color success: "#4CAF50"
    
    readonly property color background: "#F5F5F5"
    readonly property color surface: "#FFFFFF"
    readonly property color surfaceDark: "#FAFAFA"
    
    readonly property color textPrimary: "#212121"
    readonly property color textSecondary: "#757575"
    readonly property color textDisabled: "#9E9E9E"
    
    readonly property color border: "#E0E0E0"
    readonly property color divider: "#BDBDBD"
    
    // Typography
    readonly property int fontSizeXLarge: 28
    readonly property int fontSizeLarge: 20
    readonly property int fontSizeMedium: 16
    readonly property int fontSizeNormal: 14
    readonly property int fontSizeSmall: 12
    
    // Spacing
    readonly property int spacingXSmall: 4
    readonly property int spacingSmall: 8
    readonly property int spacingMedium: 15
    readonly property int spacingLarge: 20
    readonly property int spacingXLarge: 30
    
    // Radius
    readonly property int radiusSmall: 4
    readonly property int radiusMedium: 8
    readonly property int radiusLarge: 12
}
