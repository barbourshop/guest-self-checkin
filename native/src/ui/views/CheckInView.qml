import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    
    RowLayout {
        anchors.fill: parent
        anchors.margins: 20
        spacing: 20
        
        // Left panel: Search
        Rectangle {
            Layout.fillHeight: true
            Layout.preferredWidth: parent.width * 0.4
            color: "white"
            radius: 8
            border.color: "#E0E0E0"
            border.width: 1
            
            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 15
                
                Text {
                    text: "Customer Search"
                    font.pixelSize: 20
                    font.bold: true
                    color: "#212121"
                }
                
                // Search type selector
                ComboBox {
                    id: searchTypeCombo
                    Layout.fillWidth: true
                    model: ["Email", "Phone", "Lot Number", "Name"]
                    currentIndex: 0
                    
                    onCurrentIndexChanged: {
                        if (checkInViewModel) {
                            const types = ["email", "phone", "lot", "name"]
                            checkInViewModel.searchType = types[currentIndex]
                        }
                    }
                }
                
                // Search input
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10
                    
                    TextField {
                        id: searchField
                        Layout.fillWidth: true
                        placeholderText: "Enter search query..."
                        font.pixelSize: 14
                        
                        text: checkInViewModel ? checkInViewModel.searchQuery : ""
                        onTextChanged: {
                            if (checkInViewModel) {
                                checkInViewModel.searchQuery = text
                            }
                        }
                        
                        Keys.onReturnPressed: {
                            if (checkInViewModel) {
                                checkInViewModel.search()
                            }
                        }
                    }
                    
                    Button {
                        text: "Search"
                        enabled: checkInViewModel && !checkInViewModel.isSearching
                        onClicked: {
                            if (checkInViewModel) {
                                checkInViewModel.search()
                            }
                        }
                    }
                }
                
                // Search results
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: "#FAFAFA"
                    radius: 4
                    border.color: "#E0E0E0"
                    border.width: 1
                    
                    ListView {
                        id: resultsListView
                        anchors.fill: parent
                        anchors.margins: 5
                        clip: true
                        
                        model: checkInViewModel ? checkInViewModel.searchResults : []
                        
                        delegate: ItemDelegate {
                            width: ListView.view.width - 10
                            height: 80
                            
                            background: Rectangle {
                                color: hovered ? "#E3F2FD" : "white"
                                radius: 4
                            }
                            
                            contentItem: ColumnLayout {
                                spacing: 4
                                
                                Text {
                                    text: modelData.name
                                    font.pixelSize: 16
                                    font.bold: true
                                    color: "#212121"
                                }
                                
                                Text {
                                    text: "Lot: " + (modelData.lot || "N/A")
                                    font.pixelSize: 13
                                    color: "#757575"
                                }
                                
                                Text {
                                    text: modelData.email || ""
                                    font.pixelSize: 12
                                    color: "#9E9E9E"
                                }
                            }
                            
                            onClicked: {
                                if (checkInViewModel) {
                                    checkInViewModel.selectCustomer(index)
                                }
                            }
                        }
                        
                        Text {
                            anchors.centerIn: parent
                            visible: resultsListView.count === 0 && checkInViewModel && !checkInViewModel.isSearching
                            text: "No results"
                            font.pixelSize: 14
                            color: "#9E9E9E"
                        }
                        
                        BusyIndicator {
                            anchors.centerIn: parent
                            visible: checkInViewModel && checkInViewModel.isSearching
                            running: visible
                        }
                    }
                }
            }
        }
        
        // Right panel: Selected customer & check-in
        Rectangle {
            Layout.fillHeight: true
            Layout.fillWidth: true
            color: "white"
            radius: 8
            border.color: "#E0E0E0"
            border.width: 1
            
            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 20
                
                Text {
                    text: "Check-In"
                    font.pixelSize: 20
                    font.bold: true
                    color: "#212121"
                }
                
                // Customer info
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 150
                    color: checkInViewModel && checkInViewModel.hasSelectedCustomer ? "#E8F5E9" : "#FAFAFA"
                    radius: 8
                    border.color: checkInViewModel && checkInViewModel.selectedCustomerIsMember ? "#4CAF50" : "#E0E0E0"
                    border.width: 2
                    
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 8
                        
                        Text {
                            visible: checkInViewModel && checkInViewModel.hasSelectedCustomer
                            text: checkInViewModel ? checkInViewModel.selectedCustomerName : ""
                            font.pixelSize: 22
                            font.bold: true
                            color: "#212121"
                            Layout.alignment: Qt.AlignHCenter
                        }
                        
                        Text {
                            visible: checkInViewModel && checkInViewModel.hasSelectedCustomer
                            text: "Lot: " + (checkInViewModel ? checkInViewModel.selectedCustomerLot : "")
                            font.pixelSize: 16
                            color: "#757575"
                            Layout.alignment: Qt.AlignHCenter
                        }
                        
                        Rectangle {
                            visible: checkInViewModel && checkInViewModel.selectedCustomerIsMember
                            Layout.preferredWidth: memberText.width + 20
                            Layout.preferredHeight: 30
                            color: "#4CAF50"
                            radius: 15
                            Layout.alignment: Qt.AlignHCenter
                            
                            Text {
                                id: memberText
                                anchors.centerIn: parent
                                text: checkInViewModel ? checkInViewModel.selectedCustomerMemberships : ""
                                font.pixelSize: 12
                                font.bold: true
                                color: "white"
                            }
                        }
                        
                        Text {
                            visible: checkInViewModel && !checkInViewModel.hasSelectedCustomer
                            text: "Select a customer from search results"
                            font.pixelSize: 14
                            color: "#9E9E9E"
                            Layout.alignment: Qt.AlignHCenter
                        }
                    }
                }
                
                // Guest count
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 15
                    
                    Text {
                        text: "Number of Guests:"
                        font.pixelSize: 16
                        color: "#212121"
                    }
                    
                    SpinBox {
                        id: guestCountSpinBox
                        from: 0
                        to: 20
                        value: checkInViewModel ? checkInViewModel.guestCount : 0
                        
                        onValueChanged: {
                            if (checkInViewModel) {
                                checkInViewModel.guestCount = value
                            }
                        }
                    }
                }
                
                Item {
                    Layout.fillHeight: true
                }
                
                // Action buttons
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 15
                    
                    Button {
                        text: "Check-In as Member"
                        Layout.fillWidth: true
                        Layout.preferredHeight: 60
                        font.pixelSize: 16
                        font.bold: true
                        
                        enabled: checkInViewModel && 
                                checkInViewModel.hasSelectedCustomer && 
                                checkInViewModel.selectedCustomerIsMember &&
                                !checkInViewModel.isLoading
                        
                        background: Rectangle {
                            color: parent.enabled ? (parent.pressed ? "#388E3C" : "#4CAF50") : "#E0E0E0"
                            radius: 8
                        }
                        
                        contentItem: Text {
                            text: parent.text
                            font: parent.font
                            color: parent.enabled ? "white" : "#9E9E9E"
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        
                        onClicked: {
                            if (checkInViewModel) {
                                checkInViewModel.checkInMember()
                            }
                        }
                    }
                    
                    Button {
                        text: "Check-In with Day Pass"
                        Layout.fillWidth: true
                        Layout.preferredHeight: 60
                        font.pixelSize: 16
                        font.bold: true
                        
                        enabled: checkInViewModel && 
                                checkInViewModel.hasSelectedCustomer && 
                                !checkInViewModel.isLoading
                        
                        background: Rectangle {
                            color: parent.enabled ? (parent.pressed ? "#F57C00" : "#FF9800") : "#E0E0E0"
                            radius: 8
                        }
                        
                        contentItem: Text {
                            text: parent.text
                            font: parent.font
                            color: parent.enabled ? "white" : "#9E9E9E"
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        
                        onClicked: {
                            if (checkInViewModel) {
                                checkInViewModel.checkInDayPass()
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Success dialog
    Popup {
        id: successPopup
        anchors.centerIn: parent
        width: 400
        height: 200
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        
        background: Rectangle {
            color: "white"
            radius: 12
            border.color: "#4CAF50"
            border.width: 3
        }
        
        ColumnLayout {
            anchors.centerIn: parent
            spacing: 15
            
            Text {
                id: successMessage
                text: "✓ Check-in successful!"
                font.pixelSize: 20
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
        target: checkInViewModel
        
        function onCheckInSuccess(customerName, isMember) {
            successMessage.text = "✓ " + customerName + " checked in!"
            successPopup.open()
        }
        
        function onCheckInFailed(error) {
            console.error("Check-in failed:", error)
        }
    }
}
