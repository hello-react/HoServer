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

#import "HttpResponse/UNIHTTPStringResponse.h"
#import "HttpResponse/UNIHTTPBinaryResponse.h"
#import "HttpResponse/UNIHTTPJsonResponse.h"
#import "UNIUrlConnection.h"

typedef NS_ENUM(NSInteger, UNIHTTPMethod) {
	GET,
	POST,
	PUT,
	DELETE,
    PATCH
};

typedef void (^UNIHTTPStringResponseBlock)(UNIHTTPStringResponse* stringResponse, NSError* error);
typedef void (^UNIHTTPBinaryResponseBlock)(UNIHTTPBinaryResponse* binaryResponse, NSError* error);
typedef void (^UNIHTTPJsonResponseBlock)(UNIHTTPJsonResponse* jsonResponse, NSError* error);

@interface UNIHTTPRequest : NSObject

@property(readwrite, strong) NSDictionary* headers;
@property(readwrite, strong) NSString* url;
@property(readwrite, strong) NSError* error;
@property(readwrite, strong) NSString* username;
@property(readwrite, strong) NSString* password;
@property(readwrite) UNIHTTPMethod httpMethod;

-(instancetype) initWithSimpleRequest:(UNIHTTPMethod) httpMethod url:(NSString*) url headers:(NSDictionary*) headers username:(NSString*) username password:(NSString*) password;

-(UNIHTTPStringResponse*) asString;
-(UNIHTTPStringResponse*) asString:(NSError**) error;
-(UNIUrlConnection*) asStringAsync:(UNIHTTPStringResponseBlock) response;

-(UNIHTTPBinaryResponse*) asBinary;
-(UNIHTTPBinaryResponse*) asBinary:(NSError**) error;
-(UNIUrlConnection*) asBinaryAsync:(UNIHTTPBinaryResponseBlock) response;

-(UNIHTTPJsonResponse*) asJson;
-(UNIHTTPJsonResponse*) asJson:(NSError**) error;
-(UNIUrlConnection*) asJsonAsync:(UNIHTTPJsonResponseBlock) response;

@end
