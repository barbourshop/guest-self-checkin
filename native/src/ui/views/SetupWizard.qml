import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Setup wizard for first-time configuration
Dialog {
    id: root
    modal: true
    title: "Setup Wizard"
    
    contentItem: ColumnLayout {
        spacing: 20
        
        Text {
            text: "Welcome to Front Desk App!"
            font.pixelSize: 20
            font.bold: true
        }
        
        Text {
            text: "This wizard will help you configure the application."
            font.pixelSize: 14
            color: "#757575"
        }
        
        Text {
            text: "Setup wizard implementation coming soon..."
            font.pixelSize: 12
            color: "#9E9E9E"
        }
    }
    
    standardButtons: Dialog.Ok
}
