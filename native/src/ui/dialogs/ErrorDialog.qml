import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Error dialog component
Dialog {
    id: root
    
    property string errorMessage: ""
    
    modal: true
    title: "Error"
    standardButtons: Dialog.Ok
    
    contentItem: ColumnLayout {
        spacing: 15
        
        Text {
            text: "❌"
            font.pixelSize: 48
            Layout.alignment: Qt.AlignHCenter
        }
        
        Text {
            text: errorMessage
            font.pixelSize: 14
            color: "#F44336"
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
            Layout.maximumWidth: 400
        }
    }
}
