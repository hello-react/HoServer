package com.hoserver.common;

/**
 * Call server api callback
 */
public interface HttpCallback {
    // success callback
    void onSuccess(ServerResponse response);

    // error callback
    void onHttpError(ServerResponse response, Exception e);
}
