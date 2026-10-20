import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Confirm dialog component
Dialog {
    id: root
    
    property string message: ""
    signal confirmed()
    signal cancelled()
    
    modal: true
    title: "Confirm"
    standardButtons: Dialog.Yes | Dialog.No
    
    contentItem: ColumnLayout {
        spacing: 15
        
        Text {
            text: "❓"
            font.pixelSize: 48
            Layout.alignment: Qt.AlignHCenter
        }
        
        Text {
            text: message
            font.pixelSize: 14
            color: "#212121"
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
            Layout.maximumWidth: 400
        }
    }
    
    onAccepted: confirmed()
    onRejected: cancelled()
}
