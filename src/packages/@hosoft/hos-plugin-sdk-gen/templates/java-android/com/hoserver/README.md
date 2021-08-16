## HoServer Android Java 客户端 SDK 使用方法

1. 将生成的代码拷贝到工程目录中。

2. 修改 AndroidManifest.xml 加入网络访问权限：

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

3. 本地调试请添加 usesCleartextTraffic 并设置为 true，生产请使用 HTTPS。
```xml
<application
    ...
    android:usesCleartextTraffic="true"
    ...
>
```

4. 修改 com/hoserver/common/Constants.java 中的服务器地址：
```java
public class Constants {
    // 修改成服务器 Api 地址
    public static String SERVER_URL = "http://localhost:3001";
}
```

5. 示例代码：

```java
package com.hoserver.example;

import android.os.Bundle;
import android.util.Log;

import com.hoserver.common.Auth;
import com.hoserver.common.HttpCallback;
import com.hoserver.common.ServerResponse;
import com.hoserver.service.UserService;

import java.util.Hashtable;
import java.util.Map;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Hashtable params = new Hashtable();
        params.put("user_name", "admin");
        params.put("password", "123456");

        // 用户登录
        UserService.login(params, new HttpCallback() {
            @Override
            public void onSuccess(ServerResponse response) {
                Map data = (Map)response.getData();
                Auth.setToken(data.get("token").toString());
                Log.i("MainActivity", response.toString());

                // 登录成功后获取用户信息
                UserService.getUserById("5d62946590250a0d49ee4003", null, new HttpCallback() {
                    @Override
                    public void onSuccess(ServerResponse response) {
                        Log.i("MainActivity", response.toString());
                    }

                    @Override
                    public void onHttpError(ServerResponse response, Exception e) {
                        Log.e("MainActivity", null, e);
                    }
                });
            }

            @Override
            public void onHttpError(ServerResponse response, Exception e) {
                Log.e("MainActivity", response.toString(), e);
            }
        });
    }
}
```
