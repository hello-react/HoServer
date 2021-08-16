## HoServer jQuery 客户端 SDK 使用方法

1. 将生成的代码拷贝到工程目录中，如 scripts。

2. 在Web 页面中引用生成的 service.js：

```
    ...
    <script src="js.cookie.min.js"></script>
    <script src="services.js"></script>
    ...
```

3. 示例代码：

```javascript
<script>
    $(document).ready(function(){
        $("#login").click(function(){
            UserService.login(
                { user_name: 'admin', password: '123456' },
                function(data) {
                    setToken(data.token)
                    $('#result').text('登录成功')
                },
                function(err) {
                    $('#result').text(JSON.stringify(err, null ,2))
                }
            )
        });

        $("#getUser").click(function(){
            UserService.getUser(
                '5d62946590250a0d49ee4003',
                { user_name: 'admin', password: '123456' },
                function(data) {
                    $('#result').text(JSON.stringify(data, null ,2))
                },
                function(err) {
                    $('#result').text(JSON.stringify(err, null ,2))
                }
            )
        });
    });
</script>

```
