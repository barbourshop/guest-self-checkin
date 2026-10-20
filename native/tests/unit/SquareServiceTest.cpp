#include <gtest/gtest.h>
#include <QCoreApplication>
#include <QEventLoop>
#include <QTimer>
#include "../mocks/MockSquareService.h"
#include "../../src/models/Customer.h"
#include "../../src/models/Segment.h"
#include "../../src/models/Group.h"

class SquareServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Ensure Qt event loop is available
        if (!QCoreApplication::instance()) {
            int argc = 0;
            char** argv = nullptr;
            app = new QCoreApplication(argc, argv);
        }
        
        mock_service = std::make_unique<MockSquareService>();
        
        // Set up test data
        Customer customer1;
        customer1.id = "CUST001";
        customer1.given_name = "John";
        customer1.family_name = "Doe";
        customer1.email_address = "john@example.com";
        customer1.phone_number = "+1234567890";
        customer1.reference_id = "LOT-123";
        customer1.segment_ids = {"SEG001", "SEG002"};
        customer1.group_ids = {"GRP001"};
        
        Customer customer2;
        customer2.id = "CUST002";
        customer2.given_name = "Jane";
        customer2.family_name = "Smith";
        customer2.email_address = "jane@example.com";
        customer2.reference_id = "LOT-456";
        customer2.segment_ids = {"SEG002"};
        
        test_customers = {customer1, customer2};
        
        Segment segment1;
        segment1.id = "SEG001";
        segment1.name = "Annual Members";
        segment1.enabled = true;
        
        Segment segment2;
        segment2.id = "SEG002";
        segment2.name = "Monthly Members";
        segment2.enabled = true;
        
        test_segments = {segment1, segment2};
        
        Group group1;
        group1.id = "GRP001";
        group1.name = "Premium";
        group1.enabled = true;
        
        test_groups = {group1};
        
        mock_service->set_customers(test_customers);
        mock_service->set_customer("CUST001", customer1);
        mock_service->set_customer("CUST002", customer2);
        mock_service->set_segments(test_segments);
        mock_service->set_groups(test_groups);
    }
    
    void TearDown() override {
        mock_service.reset();
    }
    
    // Helper to wait for QFuture
    template<typename T>
    T wait_for_future(QFuture<T>& future, int timeout_ms = 5000) {
        QEventLoop loop;
        QTimer timer;
        timer.setSingleShot(true);
        
        connect(&timer, &QTimer::timeout, &loop, &QEventLoop::quit);
        
        // Use QFutureWatcher to know when future completes
        auto* watcher = new QFutureWatcher<T>();
        connect(watcher, &QFutureWatcherBase::finished, &loop, &QEventLoop::quit);
        watcher->setFuture(future);
        
        timer.start(timeout_ms);
        loop.exec();
        
        if (!future.isFinished()) {
            throw std::runtime_error("Future timeout");
        }
        
        T result = future.result();
        watcher->deleteLater();
        return result;
    }
    
    QCoreApplication* app = nullptr;
    std::unique_ptr<MockSquareService> mock_service;
    std::vector<Customer> test_customers;
    std::vector<Segment> test_segments;
    std::vector<Group> test_groups;
};

TEST_F(SquareServiceTest, SearchCustomersByEmail) {
    auto future = mock_service->search_customers("john@example.com", "email");
    auto result = wait_for_future(future);
    
    ASSERT_TRUE(result.is_ok());
    auto customers = result.value();
    ASSERT_EQ(customers.size(), 1);
    EXPECT_EQ(customers[0].id, "CUST001");
    EXPECT_EQ(customers[0].email_address.value(), "john@example.com");
}

TEST_F(SquareServiceTest, SearchCustomersByLot) {
    auto future = mock_service->search_customers("LOT-123", "lot");
    auto result = wait_for_future(future);
    
    ASSERT_TRUE(result.is_ok());
    auto customers = result.value();
    ASSERT_EQ(customers.size(), 1);
    EXPECT_EQ(customers[0].reference_id.value(), "LOT-123");
}

TEST_F(SquareServiceTest, SearchCustomersByName) {
    auto future = mock_service->search_customers("Jane", "name");
    auto result = wait_for_future(future);
    
    ASSERT_TRUE(result.is_ok());
    auto customers = result.value();
    ASSERT_EQ(customers.size(), 1);
    EXPECT_EQ(customers[0].given_name, "Jane");
}

TEST_F(SquareServiceTest, GetCustomerById) {
    auto future = mock_service->get_customer("CUST001");
    auto result = wait_for_future(future);
    
    ASSERT_TRUE(result.is_ok());
    auto customer = result.value();
    EXPECT_EQ(customer.id, "CUST001");
    EXPECT_EQ(customer.given_name, "John");
    EXPECT_EQ(customer.family_name, "Doe");
}

TEST_F(SquareServiceTest, GetCustomerNotFound) {
    auto future = mock_service->get_customer("CUST999");
    auto result = wait_for_future(future);
    
    EXPECT_TRUE(result.is_error());
    EXPECT_EQ(result.error(), "Customer not found");
}

TEST_F(SquareServiceTest, ListSegments) {
    auto future = mock_service->list_segments();
    auto result = wait_for_future(future);
    
    ASSERT_TRUE(result.is_ok());
    auto segments = result.value();
    ASSERT_EQ(segments.size(), 2);
    EXPECT_EQ(segments[0].id, "SEG001");
    EXPECT_EQ(segments[0].name, "Annual Members");
    EXPECT_EQ(segments[1].id, "SEG002");
    EXPECT_EQ(segments[1].name, "Monthly Members");
}

TEST_F(SquareServiceTest, ListGroups) {
    auto future = mock_service->list_groups();
    auto result = wait_for_future(future);
    
    ASSERT_TRUE(result.is_ok());
    auto groups = result.value();
    ASSERT_EQ(groups.size(), 1);
    EXPECT_EQ(groups[0].id, "GRP001");
    EXPECT_EQ(groups[0].name, "Premium");
}

TEST_F(SquareServiceTest, TestConnection) {
    auto future = mock_service->test_connection();
    auto result = wait_for_future(future);
    
    EXPECT_TRUE(result.is_ok());
}

TEST_F(SquareServiceTest, ErrorHandling) {
    mock_service->set_error("API Error");
    
    auto future = mock_service->search_customers("test", "email");
    auto result = wait_for_future(future);
    
    EXPECT_TRUE(result.is_error());
    EXPECT_EQ(result.error(), "API Error");
}

TEST_F(SquareServiceTest, CustomerWithSegmentsAndGroups) {
    auto future = mock_service->get_customer("CUST001");
    auto result = wait_for_future(future);
    
    ASSERT_TRUE(result.is_ok());
    auto customer = result.value();
    
    ASSERT_EQ(customer.segment_ids.size(), 2);
    EXPECT_EQ(customer.segment_ids[0], "SEG001");
    EXPECT_EQ(customer.segment_ids[1], "SEG002");
    
    ASSERT_EQ(customer.group_ids.size(), 1);
    EXPECT_EQ(customer.group_ids[0], "GRP001");
}
