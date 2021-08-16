package com.hoserver.common;

/**
 * Used to store user token
 */
public class Auth {
    private static String token = "";

    public static String getToken() {
        return token;
    }

    public static void setToken(String token) {
        Auth.token = token;
    }
}
