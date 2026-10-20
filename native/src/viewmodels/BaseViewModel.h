#pragma once

#include <QObject>
#include <QString>

/**
 * Base class for all ViewModels.
 * Provides common functionality like loading states and error handling.
 */
class BaseViewModel : public QObject {
    Q_OBJECT
    
    Q_PROPERTY(bool isLoading READ isLoading NOTIFY isLoadingChanged)
    Q_PROPERTY(QString errorMessage READ errorMessage NOTIFY errorMessageChanged)
    Q_PROPERTY(bool hasError READ hasError NOTIFY hasErrorChanged)
    
public:
    explicit BaseViewModel(QObject* parent = nullptr)
        : QObject(parent)
        , is_loading_(false)
        , has_error_(false)
    {}
    
    virtual ~BaseViewModel() = default;
    
    bool isLoading() const { return is_loading_; }
    QString errorMessage() const { return error_message_; }
    bool hasError() const { return has_error_; }
    
signals:
    void isLoadingChanged();
    void errorMessageChanged();
    void hasErrorChanged();
    
protected:
    void setLoading(bool loading) {
        if (is_loading_ != loading) {
            is_loading_ = loading;
            emit isLoadingChanged();
        }
    }
    
    void setError(const QString& error) {
        error_message_ = error;
        has_error_ = !error.isEmpty();
        emit errorMessageChanged();
        emit hasErrorChanged();
    }
    
    void clearError() {
        error_message_.clear();
        has_error_ = false;
        emit errorMessageChanged();
        emit hasErrorChanged();
    }
    
private:
    bool is_loading_;
    bool has_error_;
    QString error_message_;
};
