import QtQuick
import QtQuick.Controls

// Membership badge component
Rectangle {
    id: root
    
    property string membershipName: ""
    property color badgeColor: "#4CAF50"
    
    width: badgeText.width + 20
    height: 28
    color: badgeColor
    radius: 14
    
    Text {
        id: badgeText
        anchors.centerIn: parent
        text: membershipName
        font.pixelSize: 12
        font.bold: true
        color: "white"
    }
}
