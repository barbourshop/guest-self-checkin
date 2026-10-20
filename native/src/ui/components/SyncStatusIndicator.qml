import QtQuick
import QtQuick.Controls

// Sync status indicator
Rectangle {
    id: root
    
    property bool isSynced: true
    property int pendingCount: 0
    
    width: statusText.width + 30
    height: 30
    color: isSynced ? "#4CAF50" : "#FF9800"
    radius: 15
    
    Row {
        anchors.centerIn: parent
        spacing: 8
        
        Rectangle {
            width: 8
            height: 8
            radius: 4
            color: "white"
            anchors.verticalCenter: parent.verticalCenter
        }
        
        Text {
            id: statusText
            text: isSynced ? "Synced" : pendingCount + " pending"
            font.pixelSize: 12
            font.bold: true
            color: "white"
            anchors.verticalCenter: parent.verticalCenter
        }
    }
}
