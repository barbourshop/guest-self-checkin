#include <gtest/gtest.h>
#include <QCoreApplication>

int main(int argc, char **argv) {
    // Initialize Qt Core Application (required for Qt resources)
    QCoreApplication app(argc, argv);
    
    // Initialize Google Test
    ::testing::InitGoogleTest(&argc, argv);
    
    // Run tests
    return RUN_ALL_TESTS();
}
