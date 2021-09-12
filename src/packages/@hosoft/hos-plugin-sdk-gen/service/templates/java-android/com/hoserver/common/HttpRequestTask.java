package com.hoserver.common;

import android.os.AsyncTask;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.Hashtable;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class HttpRequestTask<T> extends AsyncTask {
    private String url;
    private String method;
    private Hashtable args;
    private HttpCallback callback;
    private Exception exception;
    private Class<T> response;

    public HttpRequestTask(String url, String method, Hashtable args, HttpCallback callback) {
        this.url = url;
        this.method = method;
        this.args = args;
        this.callback = callback;
    }

    @Override
    protected void onPreExecute()
    {
        super.onPreExecute();
    }

    @Override
    protected ServerResponse<T> doInBackground(Object[] objects) {
        OkHttpClient client = new OkHttpClient().newBuilder().build();

        String data;
        RequestBody body = null;

        Gson gson = new Gson();

        if (this.args != null) {
            data = gson.toJson(this.args);
            MediaType mediaType;

            if (this.method.equals("POST")) {
                mediaType = MediaType.parse("application/json;charset=utf-8");
            } else {
                mediaType = MediaType.parse("text/plain;charset=utf-8");
            }

            body = RequestBody.create(mediaType, data);
        }

        Request request = new Request.Builder()
                .url(this.url)
                .method(this.method, body)
                .addHeader("token", Auth.getToken())
                .build();

        try {
            Response response = client.newCall(request).execute();
            ResponseBody responseBody = response.body();

            Type serializeType = new TypeToken<ServerResponse<T>>() {}.getType();
            String responseStr = responseBody.string();
            ServerResponse<T> res = gson.fromJson(responseStr, serializeType);

            return res;
        } catch (Exception e) {
            e.printStackTrace();
            this.exception = e;
            return null;
        }
    }

    @Override
    protected void onPostExecute(Object result) {
        super.onPostExecute(result);

        if (this.callback != null) {
            if (result == null) {
                this.callback.onHttpError(null, this.exception);
            } else {
                this.callback.onSuccess((ServerResponse)result);
            }
        }
    }
}
