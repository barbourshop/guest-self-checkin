#include <gtest/gtest.h>
#include "services/DatabaseService.h"
#include "models/Customer.h"
#include "models/CheckIn.h"
#include "models/Segment.h"
#include "models/Group.h"
#include <filesystem>
#include <QCoreApplication>

class DatabaseServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Use in-memory database for tests
        test_db_path_ = ":memory:";
        db_ = std::make_unique<DatabaseService>();
        
        auto result = db_->initialize(test_db_path_);
        ASSERT_TRUE(result.is_ok()) << "Failed to initialize database: " << result.error();
    }
    
    void TearDown() override {
        if (db_) {
            db_->close();
        }
        db_.reset();
    }
    
    std::filesystem::path test_db_path_;
    std::unique_ptr<DatabaseService> db_;
};

// Basic connection tests
TEST_F(DatabaseServiceTest, InitializeAndClose) {
    EXPECT_TRUE(db_->is_open());
    
    auto result = db_->close();
    EXPECT_TRUE(result.is_ok());
    EXPECT_FALSE(db_->is_open());
}

// Segment tests
TEST_F(DatabaseServiceTest, UpsertAndGetSegment) {
    Segment segment;
    segment.id = "seg_123";
    segment.display_name = "Annual Member";
    segment.sort_order = 1;
    segment.enabled = true;
    
    auto upsert_result = db_->upsert_segment(segment);
    ASSERT_TRUE(upsert_result.is_ok());
    
    auto get_result = db_->get_segment("seg_123");
    ASSERT_TRUE(get_result.is_ok());
    ASSERT_TRUE(get_result.value().has_value());
    
    auto loaded = get_result.value().value();
    EXPECT_EQ(loaded.id, segment.id);
    EXPECT_EQ(loaded.display_name, segment.display_name);
    EXPECT_EQ(loaded.sort_order, segment.sort_order);
    EXPECT_EQ(loaded.enabled, segment.enabled);
}

TEST_F(DatabaseServiceTest, GetAllSegments) {
    // Add multiple segments
    for (int i = 0; i < 3; ++i) {
        Segment seg;
        seg.id = "seg_" + std::to_string(i);
        seg.display_name = "Segment " + std::to_string(i);
        seg.sort_order = i;
        seg.enabled = (i % 2 == 0);  // Alternate enabled/disabled
        
        db_->upsert_segment(seg);
    }
    
    auto all_result = db_->get_segments();
    ASSERT_TRUE(all_result.is_ok());
    EXPECT_EQ(all_result.value().size(), 3);
    
    auto enabled_result = db_->get_enabled_segments();
    ASSERT_TRUE(enabled_result.is_ok());
    EXPECT_EQ(enabled_result.value().size(), 2);  // seg_0 and seg_2
}

TEST_F(DatabaseServiceTest, DeleteSegment) {
    Segment segment;
    segment.id = "seg_delete_me";
    segment.display_name = "To Delete";
    
    db_->upsert_segment(segment);
    
    auto delete_result = db_->delete_segment("seg_delete_me");
    ASSERT_TRUE(delete_result.is_ok());
    
    auto get_result = db_->get_segment("seg_delete_me");
    ASSERT_TRUE(get_result.is_ok());
    EXPECT_FALSE(get_result.value().has_value());
}

// Group tests
TEST_F(DatabaseServiceTest, UpsertAndGetGroup) {
    Group group;
    group.id = "grp_456";
    group.display_name = "Pool Pass Holders";
    group.sort_order = 10;
    group.enabled = true;
    
    auto upsert_result = db_->upsert_group(group);
    ASSERT_TRUE(upsert_result.is_ok());
    
    auto get_result = db_->get_group("grp_456");
    ASSERT_TRUE(get_result.is_ok());
    ASSERT_TRUE(get_result.value().has_value());
    
    auto loaded = get_result.value().value();
    EXPECT_EQ(loaded.id, group.id);
    EXPECT_EQ(loaded.display_name, group.display_name);
    EXPECT_EQ(loaded.sort_order, group.sort_order);
    EXPECT_EQ(loaded.enabled, group.enabled);
}

TEST_F(DatabaseServiceTest, GetEnabledGroups) {
    Group g1{"grp_1", "Group 1", "Group 1", true, 1};
    Group g2{"grp_2", "Group 2", "Group 2", false, 2};
    Group g3{"grp_3", "Group 3", "Group 3", true, 3};
    
    db_->upsert_group(g1);
    db_->upsert_group(g2);
    db_->upsert_group(g3);
    
    auto enabled_result = db_->get_enabled_groups();
    ASSERT_TRUE(enabled_result.is_ok());
    EXPECT_EQ(enabled_result.value().size(), 2);  // g1 and g3
}

// Customer cache tests
TEST_F(DatabaseServiceTest, UpsertAndGetCustomer) {
    Customer customer;
    customer.id = "cust_abc123";
    customer.given_name = "John";
    customer.family_name = "Doe";
    customer.email_address = "john@example.com";
    customer.phone_number = "555-0123";
    customer.reference_id = "LOT-123";
    customer.segment_ids = {"seg_1", "seg_2"};
    customer.group_ids = {"grp_1"};
    customer.last_verified_at = std::chrono::system_clock::now();
    
    auto upsert_result = db_->upsert_cached_customer(customer);
    ASSERT_TRUE(upsert_result.is_ok());
    
    auto get_result = db_->get_cached_customer("cust_abc123");
    ASSERT_TRUE(get_result.is_ok());
    ASSERT_TRUE(get_result.value().has_value());
    
    auto loaded = get_result.value().value();
    EXPECT_EQ(loaded.id, customer.id);
    EXPECT_EQ(loaded.given_name, customer.given_name);
    EXPECT_EQ(loaded.family_name, customer.family_name);
    EXPECT_EQ(loaded.email_address, customer.email_address);
    EXPECT_EQ(loaded.phone_number, customer.phone_number);
    EXPECT_EQ(loaded.reference_id, customer.reference_id);
    EXPECT_EQ(loaded.segment_ids.size(), 2);
    EXPECT_EQ(loaded.group_ids.size(), 1);
}

TEST_F(DatabaseServiceTest, ClearCache) {
    // Add some customers
    for (int i = 0; i < 5; ++i) {
        Customer c;
        c.id = "cust_" + std::to_string(i);
        c.given_name = "Customer " + std::to_string(i);
        c.family_name = "Test";
        db_->upsert_cached_customer(c);
    }
    
    auto count_before = db_->count_cached_customers();
    ASSERT_TRUE(count_before.is_ok());
    EXPECT_EQ(count_before.value(), 5);
    
    auto clear_result = db_->clear_cache();
    ASSERT_TRUE(clear_result.is_ok());
    
    auto count_after = db_->count_cached_customers();
    ASSERT_TRUE(count_after.is_ok());
    EXPECT_EQ(count_after.value(), 0);
}

TEST_F(DatabaseServiceTest, CacheLastRefresh) {
    auto now = std::chrono::system_clock::now();
    
    auto set_result = db_->set_cache_last_refresh(now);
    ASSERT_TRUE(set_result.is_ok());
    
    auto get_result = db_->get_cache_last_refresh();
    ASSERT_TRUE(get_result.is_ok());
    ASSERT_TRUE(get_result.value().has_value());
    
    // Allow some margin for time conversion precision
    auto diff = std::chrono::duration_cast<std::chrono::seconds>(
        get_result.value().value() - now
    );
    EXPECT_LE(std::abs(diff.count()), 1);
}

// Check-in tests
TEST_F(DatabaseServiceTest, CreateCheckIn) {
    CheckIn checkin;
    checkin.customer_id = "cust_123";
    checkin.guest_count = 3;
    checkin.timestamp = std::chrono::system_clock::now();
    checkin.checkin_type = "member";
    checkin.customer_name = "John Doe";
    checkin.email_address = "john@example.com";
    checkin.lot_number = "LOT-456";
    checkin.membership_types = {"Annual Member", "Pool Pass"};
    checkin.location_id = "FrontDesk1";
    
    auto result = db_->create_checkin(checkin);
    ASSERT_TRUE(result.is_ok());
    EXPECT_GT(result.value(), 0);
    
    // Verify it was created
    auto checkins = db_->get_all_checkins();
    ASSERT_TRUE(checkins.is_ok());
    EXPECT_EQ(checkins.value().size(), 1);
    
    auto& loaded = checkins.value()[0];
    EXPECT_EQ(loaded.customer_id, checkin.customer_id);
    EXPECT_EQ(loaded.guest_count, checkin.guest_count);
    EXPECT_EQ(loaded.checkin_type, checkin.checkin_type);
    EXPECT_EQ(loaded.customer_name, checkin.customer_name);
    EXPECT_EQ(loaded.membership_types.size(), 2);
}

TEST_F(DatabaseServiceTest, GetCheckInsForDate) {
    auto today = std::chrono::floor<std::chrono::days>(std::chrono::system_clock::now());
    auto yesterday = today - std::chrono::hours(24);
    
    // Create check-ins for today and yesterday
    for (int i = 0; i < 3; ++i) {
        CheckIn checkin;
        checkin.customer_id = "cust_today_" + std::to_string(i);
        checkin.guest_count = 1;
        checkin.timestamp = today + std::chrono::hours(10);
        checkin.checkin_type = "member";
        db_->create_checkin(checkin);
    }
    
    for (int i = 0; i < 2; ++i) {
        CheckIn checkin;
        checkin.customer_id = "cust_yesterday_" + std::to_string(i);
        checkin.guest_count = 1;
        checkin.timestamp = yesterday + std::chrono::hours(10);
        checkin.checkin_type = "member";
        db_->create_checkin(checkin);
    }
    
    auto today_result = db_->get_checkins_for_date(today);
    ASSERT_TRUE(today_result.is_ok());
    EXPECT_EQ(today_result.value().size(), 3);
    
    auto yesterday_result = db_->get_checkins_for_date(yesterday);
    ASSERT_TRUE(yesterday_result.is_ok());
    EXPECT_EQ(yesterday_result.value().size(), 2);
}

TEST_F(DatabaseServiceTest, CountCheckIns) {
    // Create some check-ins
    for (int i = 0; i < 10; ++i) {
        CheckIn checkin;
        checkin.customer_id = "cust_" + std::to_string(i);
        checkin.guest_count = 1;
        checkin.timestamp = std::chrono::system_clock::now();
        checkin.checkin_type = i % 3 == 0 ? "daypass" : "member";
        db_->create_checkin(checkin);
    }
    
    auto count_result = db_->count_checkins();
    ASSERT_TRUE(count_result.is_ok());
    EXPECT_EQ(count_result.value(), 10);
    
    // Test filtering
    auto filter_result = db_->get_all_checkins("cust_5");
    ASSERT_TRUE(filter_result.is_ok());
    EXPECT_EQ(filter_result.value().size(), 1);
}

// Queue tests
TEST_F(DatabaseServiceTest, QueueOperations) {
    CheckIn checkin;
    checkin.customer_id = "cust_queue";
    checkin.guest_count = 2;
    checkin.timestamp = std::chrono::system_clock::now();
    checkin.checkin_type = "member";
    
    // Enqueue
    auto enqueue_result = db_->enqueue_checkin(checkin);
    ASSERT_TRUE(enqueue_result.is_ok());
    int queue_id = enqueue_result.value();
    
    // Check pending count
    auto count_result = db_->get_pending_queue_count();
    ASSERT_TRUE(count_result.is_ok());
    EXPECT_EQ(count_result.value(), 1);
    
    // Get pending items
    auto pending_result = db_->get_pending_queue_items(10);
    ASSERT_TRUE(pending_result.is_ok());
    EXPECT_EQ(pending_result.value().size(), 1);
    
    // Mark as synced
    auto sync_result = db_->mark_queue_item_synced(queue_id);
    ASSERT_TRUE(sync_result.is_ok());
    
    // Count should be zero now
    auto count_after = db_->get_pending_queue_count();
    ASSERT_TRUE(count_after.is_ok());
    EXPECT_EQ(count_after.value(), 0);
}

TEST_F(DatabaseServiceTest, QueueFailedItems) {
    CheckIn checkin;
    checkin.customer_id = "cust_fail";
    checkin.guest_count = 1;
    checkin.timestamp = std::chrono::system_clock::now();
    checkin.checkin_type = "member";
    
    auto enqueue_result = db_->enqueue_checkin(checkin);
    ASSERT_TRUE(enqueue_result.is_ok());
    int queue_id = enqueue_result.value();
    
    // Mark as failed
    auto fail_result = db_->mark_queue_item_failed(queue_id, "Network error");
    ASSERT_TRUE(fail_result.is_ok());
    
    // Should still be pending
    auto count_result = db_->get_pending_queue_count();
    ASSERT_TRUE(count_result.is_ok());
    EXPECT_EQ(count_result.value(), 1);
}

// Transaction tests
TEST_F(DatabaseServiceTest, TransactionCommit) {
    auto txn_result = db_->begin_transaction();
    ASSERT_TRUE(txn_result.is_ok());
    auto txn = std::move(txn_result.value());
    
    Segment seg{"seg_txn", "Transaction Test", "Transaction Test", true, 1};
    auto upsert_result = db_->upsert_segment(seg);
    ASSERT_TRUE(upsert_result.is_ok());
    
    auto commit_result = txn.commit();
    ASSERT_TRUE(commit_result.is_ok());
    
    // Verify segment exists
    auto get_result = db_->get_segment("seg_txn");
    ASSERT_TRUE(get_result.is_ok());
    EXPECT_TRUE(get_result.value().has_value());
}

TEST_F(DatabaseServiceTest, TransactionRollback) {
    auto txn_result = db_->begin_transaction();
    ASSERT_TRUE(txn_result.is_ok());
    auto txn = std::move(txn_result.value());
    
    Segment seg{"seg_rollback", "Rollback Test", "Rollback Test", true, 1};
    db_->upsert_segment(seg);
    
    auto rollback_result = txn.rollback();
    ASSERT_TRUE(rollback_result.is_ok());
    
    // Segment should not exist
    auto get_result = db_->get_segment("seg_rollback");
    ASSERT_TRUE(get_result.is_ok());
    EXPECT_FALSE(get_result.value().has_value());
}

// Configuration tests
TEST_F(DatabaseServiceTest, ConfigOperations) {
    auto set_result = db_->set_config("test_key", "test_value");
    ASSERT_TRUE(set_result.is_ok());
    
    auto get_result = db_->get_config("test_key");
    ASSERT_TRUE(get_result.is_ok());
    ASSERT_TRUE(get_result.value().has_value());
    EXPECT_EQ(get_result.value().value(), "test_value");
    
    auto delete_result = db_->delete_config("test_key");
    ASSERT_TRUE(delete_result.is_ok());
    
    auto get_after_delete = db_->get_config("test_key");
    ASSERT_TRUE(get_after_delete.is_ok());
    EXPECT_FALSE(get_after_delete.value().has_value());
}

// Statistics test
TEST_F(DatabaseServiceTest, GetStatistics) {
    // Add some test data
    Segment seg{"seg_1", "Test Segment", "Test Segment", true, 1};
    db_->upsert_segment(seg);
    
    Customer customer;
    customer.id = "cust_stats";
    customer.given_name = "Stats";
    customer.family_name = "Test";
    db_->upsert_cached_customer(customer);
    
    CheckIn member_checkin;
    member_checkin.customer_id = "cust_stats";
    member_checkin.guest_count = 2;
    member_checkin.timestamp = std::chrono::system_clock::now();
    member_checkin.checkin_type = "member";
    db_->create_checkin(member_checkin);
    
    CheckIn daypass_checkin;
    daypass_checkin.customer_id = "daypass";
    daypass_checkin.guest_count = 3;
    daypass_checkin.timestamp = std::chrono::system_clock::now();
    daypass_checkin.checkin_type = "daypass";
    db_->create_checkin(daypass_checkin);
    
    auto stats_result = db_->get_statistics();
    ASSERT_TRUE(stats_result.is_ok());
    
    auto stats = stats_result.value();
    EXPECT_EQ(stats.total_checkins, 2);
    EXPECT_EQ(stats.member_checkins, 1);
    EXPECT_EQ(stats.daypass_checkins, 1);
    EXPECT_EQ(stats.cached_customers, 1);
}

// Main function for Qt application
int main(int argc, char** argv) {
    QCoreApplication app(argc, argv);
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
