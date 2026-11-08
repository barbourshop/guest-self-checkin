import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ApplicationWindow {
    id: root
    width: 1024
    height: 768
    visible: true
    title: "Front Desk Check-In"
    
    color: "#F5F5F5"
    
    // Main content area with tab navigation
    ColumnLayout {
        anchors.fill: parent
        spacing: 0
        
        // Header
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 80
            color: "#2196F3"
            
            RowLayout {
                anchors.fill: parent
                anchors.margins: 20
                
                Text {
                    text: "Front Desk Check-In"
                    font.pixelSize: 28
                    font.bold: true
                    color: "white"
                    Layout.fillWidth: true
                }
                
                // Today's stats
                RowLayout {
                    spacing: 30
                    
                    Rectangle {
                        width: 120
                        height: 60
                        radius: 8
                        color: "#4CAF50"
                        
                        ColumnLayout {
                            anchors.centerIn: parent
                            spacing: 4
                            
                            Text {
                                text: checkInViewModel ? checkInViewModel.todayMemberCount : 0
                                font.pixelSize: 24
                                font.bold: true
                                color: "white"
                                Layout.alignment: Qt.AlignHCenter
                            }
                            
                            Text {
                                text: "Members"
                                font.pixelSize: 12
                                color: "white"
                                opacity: 0.9
                                Layout.alignment: Qt.AlignHCenter
                            }
                        }
                    }
                    
                    Rectangle {
                        width: 120
                        height: 60
                        radius: 8
                        color: "#FF9800"
                        
                        ColumnLayout {
                            anchors.centerIn: parent
                            spacing: 4
                            
                            Text {
                                text: checkInViewModel ? checkInViewModel.todayDayPassCount : 0
                                font.pixelSize: 24
                                font.bold: true
                                color: "white"
                                Layout.alignment: Qt.AlignHCenter
                            }
                            
                            Text {
                                text: "Day Pass"
                                font.pixelSize: 12
                                color: "white"
                                opacity: 0.9
                                Layout.alignment: Qt.AlignHCenter
                            }
                        }
                    }
                    
                    Rectangle {
                        width: 120
                        height: 60
                        radius: 8
                        color: "#9C27B0"
                        
                        ColumnLayout {
                            anchors.centerIn: parent
                            spacing: 4
                            
                            Text {
                                text: checkInViewModel ? checkInViewModel.todayTotalGuests : 0
                                font.pixelSize: 24
                                font.bold: true
                                color: "white"
                                Layout.alignment: Qt.AlignHCenter
                            }
                            
                            Text {
                                text: "Total Guests"
                                font.pixelSize: 12
                                color: "white"
                                opacity: 0.9
                                Layout.alignment: Qt.AlignHCenter
                            }
                        }
                    }
                }
            }
        }
        
        // Tab bar
        TabBar {
            id: tabBar
            Layout.fillWidth: true
            
            TabButton {
                text: "Check-In"
                font.pixelSize: 16
            }
            
            TabButton {
                text: "Admin"
                font.pixelSize: 16
            }
        }
        
        // Content area
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: tabBar.currentIndex
            
            // Check-in view
            CheckInView {
                
            }
            
            // Admin view
            AdminView {
                
            }
        }
    }
}
