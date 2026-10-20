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
                    
                    StatsCard {
                        label: "Members"
                        value: checkInViewModel ? checkInViewModel.todayMemberCount : 0
                        color: "#4CAF50"
                    }
                    
                    StatsCard {
                        label: "Day Pass"
                        value: checkInViewModel ? checkInViewModel.todayDayPassCount : 0
                        color: "#FF9800"
                    }
                    
                    StatsCard {
                        label: "Total Guests"
                        value: checkInViewModel ? checkInViewModel.todayTotalGuests : 0
                        color: "#9C27B0"
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

// Stats card component
component StatsCard: Rectangle {
    property string label: ""
    property int value: 0
    property color color: "white"
    
    width: 120
    height: 60
    radius: 8
    color: parent.color
    
    ColumnLayout {
        anchors.centerIn: parent
        spacing: 4
        
        Text {
            text: parent.parent.value
            font.pixelSize: 24
            font.bold: true
            color: "white"
            Layout.alignment: Qt.AlignHCenter
        }
        
        Text {
            text: parent.parent.label
            font.pixelSize: 12
            color: "white"
            opacity: 0.9
            Layout.alignment: Qt.AlignHCenter
        }
    }
}
