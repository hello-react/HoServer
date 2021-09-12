/*
 The MIT License
 
 Copyright (c) 2013 Mashape (http://mashape.com)
 
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:
 
 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#import "UNIRest.h"

@interface UNIRest()
+ (id) getConfig:instance config:(void (^)(id)) config;
@end

static NSMutableDictionary* defaultHeaders  = nil;
static int UNIRestTimeout = 60;

@implementation UNIRest

+(void) timeout:(int) seconds {
    UNIRestTimeout = seconds;
}

+(int) timeout {
    return UNIRestTimeout;
}

+(void) defaultHeader:(NSString*) name value:(NSString*) value {
    if (defaultHeaders == nil) {
        defaultHeaders = [NSMutableDictionary dictionary];
    }
    [defaultHeaders setObject:value forKey:name];
}

+(NSMutableDictionary*) defaultHeaders {
    if (defaultHeaders == nil) {
        defaultHeaders = [NSMutableDictionary dictionary];
    }
    return defaultHeaders;
}

+(void) clearDefaultHeaders {
    if (defaultHeaders == nil) {
        defaultHeaders = [NSMutableDictionary dictionary];
    }
    [defaultHeaders removeAllObjects];
}

+ (id) getConfig:instance config:(void (^)(id)) config {
    if (config) {
        config(instance);
    }
    return instance;
}

+(UNIHTTPRequest*) get:(UNISimpleRequestBlock) config {
    UNISimpleRequest* _config = [self getConfig:[[UNISimpleRequest alloc] init] config:config];
    return [[UNIHTTPRequestWithBody alloc] initWithMultipartRequest:GET url:[_config url] headers:[_config headers] parameters:[_config parameters] username:[_config username] password:[_config password]];
}

+(UNIHTTPRequestWithBody*) post:(UNISimpleRequestBlock) config {
    UNISimpleRequest* _config = [self getConfig:[[UNISimpleRequest alloc] init] config:config];
    
    return [[UNIHTTPRequestWithBody alloc] initWithMultipartRequest:POST url:[_config url] headers:[_config headers] parameters:[_config parameters]  username:[_config username] password:[_config password]];
}

+(UNIHTTPRequestWithBody*) postEntity:(UNIBodyRequestBlock) config {
    UNIBodyRequest* _config = [self getConfig:[[UNIBodyRequest alloc] init] config:config];
    
    return [[UNIHTTPRequestWithBody alloc] initWithBodyRequest:POST url:[_config url] headers:[_config headers] body:[_config body]  username:[_config username] password:[_config password]];
}

+(UNIHTTPRequestWithBody*) put:(UNISimpleRequestBlock) config {
    UNISimpleRequest* _config = [self getConfig:[[UNISimpleRequest alloc] init] config:config];
    
    return [[UNIHTTPRequestWithBody alloc] initWithMultipartRequest:PUT url:[_config url] headers:[_config headers] parameters:[_config parameters]  username:[_config username] password:[_config password]];
}

+(UNIHTTPRequestWithBody*) putEntity:(UNIBodyRequestBlock) config {
    UNIBodyRequest* _config = [self getConfig:[[UNIBodyRequest alloc] init] config:config];
    
    return [[UNIHTTPRequestWithBody alloc] initWithBodyRequest:PUT url:[_config url] headers:[_config headers] body:[_config body]  username:[_config username] password:[_config password]];
}

+(UNIHTTPRequestWithBody*) patch:(UNISimpleRequestBlock) config {
    UNISimpleRequest* _config = [self getConfig:[[UNISimpleRequest alloc] init] config:config];
    
    return [[UNIHTTPRequestWithBody alloc] initWithMultipartRequest:PATCH url:[_config url] headers:[_config headers] parameters:[_config parameters]  username:[_config username] password:[_config password]];
}

+(UNIHTTPRequestWithBody*) patchEntity:(UNIBodyRequestBlock) config {
    UNIBodyRequest* _config = [self getConfig:[[UNIBodyRequest alloc] init] config:config];
    
    return [[UNIHTTPRequestWithBody alloc] initWithBodyRequest:PATCH url:[_config url] headers:[_config headers] body:[_config body]  username:[_config username] password:[_config password]];
}

+(UNIHTTPRequestWithBody*) delete:(UNISimpleRequestBlock) config {
    UNISimpleRequest* _config = [self getConfig:[[UNISimpleRequest alloc] init] config:config];
    
    return [[UNIHTTPRequestWithBody alloc] initWithMultipartRequest:DELETE url:[_config url] headers:[_config headers] parameters:[_config parameters]  username:[_config username] password:[_config password]];
}

+(UNIHTTPRequestWithBody*) deleteEntity:(UNIBodyRequestBlock) config {
    UNIBodyRequest* _config = [self getConfig:[[UNIBodyRequest alloc] init] config:config];
    
    return [[UNIHTTPRequestWithBody alloc] initWithBodyRequest:DELETE url:[_config url] headers:[_config headers] body:[_config body]  username:[_config username] password:[_config password]];
}

@end
