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

#import "UNIHTTPRequest.h"
#import "UNIHTTPClientHelper.h"

@implementation UNIHTTPRequest

-(instancetype) initWithSimpleRequest:(UNIHTTPMethod) httpMethod url:(NSString*) url headers:(NSDictionary*) headers username:(NSString*) username password:(NSString*) password {
    self = [super init];
    if (self) {
        [self setHttpMethod:httpMethod];
        [self setUrl:url];
        [self setUsername:username];
        [self setPassword:password];
        NSMutableDictionary* lowerCaseHeaders = [[NSMutableDictionary alloc] init];
        if (headers != nil) {
            for(id key in headers) {
                id value = [headers objectForKey:key];
                [lowerCaseHeaders setObject:value forKey:[key lowercaseString]];
            }
        }
        [self setHeaders:lowerCaseHeaders];
    }
    return self;
}

-(UNIHTTPStringResponse*) asString {
    return [self asString:nil];
}

-(UNIHTTPStringResponse*) asString:(NSError**) error {
    UNIHTTPResponse* response = [UNIHTTPClientHelper requestSync:self error:error];
    if (response == nil) return nil;
    return [[UNIHTTPStringResponse alloc] initWithSimpleResponse:response];
}

-(UNIUrlConnection*) asStringAsync:(UNIHTTPStringResponseBlock) response {
    return [UNIHTTPClientHelper requestAsync:self handler:^(UNIHTTPResponse * res, NSError * error) {
        if (error != nil) {
            response(nil, error);
        } else {
            response([[UNIHTTPStringResponse alloc] initWithSimpleResponse:res], error);
        }
    }];
}

-(UNIHTTPBinaryResponse*) asBinary {
    return [self asBinary:nil];
}

-(UNIHTTPBinaryResponse*) asBinary:(NSError**) error {
    UNIHTTPResponse* response = [UNIHTTPClientHelper requestSync:self error:error];
    if (response == nil) return nil;
    return [[UNIHTTPBinaryResponse alloc] initWithSimpleResponse:response];
}

-(UNIUrlConnection*) asBinaryAsync:(UNIHTTPBinaryResponseBlock) response {
    return [UNIHTTPClientHelper requestAsync:self handler:^(UNIHTTPResponse * res, NSError * error) {
        if (error != nil) {
            response(nil, error);
        } else {
            response([[UNIHTTPBinaryResponse alloc] initWithSimpleResponse:res], error);
        }
    }];
}

-(UNIHTTPJsonResponse*) asJson {
    return [self asJson:nil];
}

-(UNIHTTPJsonResponse*) asJson:(NSError**) error {
    UNIHTTPResponse* response = [UNIHTTPClientHelper requestSync:self error:error];
    if (response == nil) return nil;
    return [[UNIHTTPJsonResponse alloc] initWithSimpleResponse:response];
}

-(UNIUrlConnection*) asJsonAsync:(UNIHTTPJsonResponseBlock) response {
    return [UNIHTTPClientHelper requestAsync:self handler:^(UNIHTTPResponse * res, NSError * error) {
        if (error != nil) {
            response(nil, error);
        } else {
            response([[UNIHTTPJsonResponse alloc] initWithSimpleResponse:res], error);
        }
    }];
}

@end
