## HoServer Object-C 客户端 SDK 使用方法

1. 将生成的代码拷贝到工程目录中，并在 xcode 中添加引用为源码。

2. 修改 HoServer/Common/Constants.m 中的服务器地址：
```object-c
// 修改成服务器 Api 地址
NSString * const SERVER_URL = @"http://192.168.31.108:3001";
```

3. 示例代码：

```object-c
NSDictionary *parameters = @{@"user_name": @"admin", @"password": @"123456"};

UserService * userService = [[UserService alloc] init];
UNIUrlConnection *asyncConnection = [userService login:parameters completionHandler:^(UNIHTTPJsonResponse* jsonResponse, UNIJsonNode *body, NSError* error) {
    if (error == nil) {
        NSDictionary *data = (NSDictionary *)[(NSDictionary *)body.object objectForKey:@"data"];
        NSString *token = (NSString *)[data objectForKey:@"token"];
        [Constants setToken:token];
        
        [userService getUser:@"5d62946590250a0d49ee4003" args:parameters completionHandler:^(UNIHTTPJsonResponse* jsonResponse, UNIJsonNode *body, NSError* error) {
            NSLog(@"%@", body);
        }];
    }
    
    NSLog(@"%@", body);
}];

// [asyncConnection cancel]; // 取消调用
```
