import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Customer card component
Rectangle {
    id: root
    
    property string customerName: ""
    property string customerLot: ""
    property bool isMember: false
    property string membershipTypes: ""
    
    color: "white"
    radius: 8
    border.color: isMember ? "#4CAF50" : "#E0E0E0"
    border.width: 2
    
    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 15
        spacing: 8
        
        Text {
            text: customerName
            font.pixelSize: 18
            font.bold: true
            color: "#212121"
        }
        
        Text {
            text: "Lot: " + customerLot
            font.pixelSize: 14
            color: "#757575"
        }
        
        Rectangle {
            visible: isMember
            Layout.preferredWidth: memberText.width + 15
            Layout.preferredHeight: 25
            color: "#4CAF50"
            radius: 12
            
            Text {
                id: memberText
                anchors.centerIn: parent
                text: membershipTypes
                font.pixelSize: 11
                font.bold: true
                color: "white"
            }
        }
    }
}
