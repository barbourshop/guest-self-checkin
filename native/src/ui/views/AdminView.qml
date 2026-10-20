import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    
    ScrollView {
        anchors.fill: parent
        anchors.margins: 20
        
        ColumnLayout {
            width: root.width - 40
            spacing: 20
            
            Text {
                text: "Administration"
                font.pixelSize: 24
                font.bold: true
                color: "#212121"
            }
            
            // Reports section
            GroupBox {
                Layout.fillWidth: true
                title: "Reports & Export"
                
                ColumnLayout {
                    anchors.fill: parent
                    spacing: 15
                    
                    Button {
                        text: "Export Today's Check-Ins"
                        Layout.fillWidth: true
                        enabled: adminViewModel && !adminViewModel.isLoading
                        
                        onClicked: {
                            if (adminViewModel) {
                                adminViewModel.exportToday()
                            }
                        }
                    }
                    
                    Text {
                        text: "Export check-ins as Excel (.xlsx) file"
                        font.pixelSize: 12
                        color: "#757575"
                    }
                }
            }
            
            // Google Sheets sync section
            GroupBox {
                Layout.fillWidth: true
                title: "Google Sheets Sync"
                
                ColumnLayout {
                    anchors.fill: parent
                    spacing: 15
                    
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        
                        Text {
                            text: "Status:"
                            font.pixelSize: 14
                            color: "#212121"
                        }
                        
                        Rectangle {
                            width: statusText.width + 20
                            height: 25
                            color: adminViewModel && adminViewModel.isGoogleSheetsAuthorized ? "#4CAF50" : "#F44336"
                            radius: 12
                            
                            Text {
                                id: statusText
                                anchors.centerIn: parent
                                text: adminViewModel && adminViewModel.isGoogleSheetsAuthorized ? "Authorized" : "Not Authorized"
                                font.pixelSize: 12
                                font.bold: true
                                color: "white"
                            }
                        }
                    }
                    
                    RowLayout {
                        Layout.fillWidth: true
                        visible: adminViewModel && adminViewModel.isGoogleSheetsAuthorized
                        spacing: 10
                        
                        Text {
                            text: "Pending items:"
                            font.pixelSize: 14
                            color: "#212121"
                        }
                        
                        Text {
                            text: adminViewModel ? adminViewModel.pendingSyncCount : 0
                            font.pixelSize: 14
                            font.bold: true
                            color: "#2196F3"
                        }
                    }
                    
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        
                        Button {
                            text: adminViewModel && adminViewModel.isGoogleSheetsAuthorized ? "Sync Now" : "Authorize"
                            enabled: adminViewModel && !adminViewModel.isLoading && !adminViewModel.isSyncing
                            Layout.fillWidth: true
                            
                            onClicked: {
                                if (adminViewModel) {
                                    if (adminViewModel.isGoogleSheetsAuthorized) {
                                        adminViewModel.syncToGoogleSheets()
                                    } else {
                                        adminViewModel.authorizeGoogleSheets()
                                    }
                                }
                            }
                        }
                        
                        Button {
                            visible: adminViewModel && adminViewModel.isGoogleSheetsAuthorized
                            text: "Clear Authorization"
                            enabled: adminViewModel && !adminViewModel.isLoading
                            
                            onClicked: {
                                if (adminViewModel) {
                                    adminViewModel.clearGoogleSheetsAuth()
                                }
                            }
                        }
                    }
                    
                    BusyIndicator {
                        visible: adminViewModel && adminViewModel.isSyncing
                        running: visible
                        Layout.alignment: Qt.AlignHCenter
                    }
                }
            }
            
            // Membership cache section
            GroupBox {
                Layout.fillWidth: true
                title: "Membership Cache"
                
                ColumnLayout {
                    anchors.fill: parent
                    spacing: 15
                    
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        
                        Text {
                            text: "Last refresh:"
                            font.pixelSize: 14
                            color: "#212121"
                        }
                        
                        Text {
                            text: adminViewModel ? adminViewModel.cacheAge : "Unknown"
                            font.pixelSize: 14
                            font.bold: true
                            color: adminViewModel && adminViewModel.cacheNeedsRefresh ? "#F44336" : "#4CAF50"
                        }
                    }
                    
                    Button {
                        text: "Refresh Membership Cache"
                        Layout.fillWidth: true
                        enabled: adminViewModel && !adminViewModel.isLoading
                        
                        onClicked: {
                            if (adminViewModel) {
                                adminViewModel.refreshMembershipCache()
                            }
                        }
                    }
                    
                    Text {
                        text: "Fetches latest segments and groups from Square"
                        font.pixelSize: 12
                        color: "#757575"
                    }
                }
            }
            
            Item {
                Layout.fillHeight: true
            }
        }
    }
    
    // Success dialog
    Popup {
        id: successPopup
        anchors.centerIn: parent
        width: 400
        height: 150
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        
        background: Rectangle {
            color: "white"
            radius: 12
        }
        
        ColumnLayout {
            anchors.centerIn: parent
            spacing: 15
            
            Text {
                id: successMessage
                text: "✓ Success!"
                font.pixelSize: 18
                font.bold: true
                color: "#4CAF50"
                Layout.alignment: Qt.AlignHCenter
            }
            
            Button {
                text: "OK"
                Layout.alignment: Qt.AlignHCenter
                onClicked: successPopup.close()
            }
        }
    }
    
    Connections {
        target: adminViewModel
        
        function onExportCompleted(filepath) {
            successMessage.text = "✓ Export completed!"
            successPopup.open()
        }
        
        function onSyncCompleted(count) {
            successMessage.text = "✓ Synced " + count + " items!"
            successPopup.open()
        }
        
        function onCacheRefreshCompleted() {
            successMessage.text = "✓ Cache refreshed!"
            successPopup.open()
        }
    }
}
