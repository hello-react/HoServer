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

#import "HttpResponse/UNIHTTPResponse.h"
#import "UNIHTTPRequest.h"
#import "UNIHTTPRequestWithBody.h"
#import "HttpRequest/UNISimpleRequest.h"
#import "UNIUrlConnection.h"

#define BOUNDARY @"---------------------------17237809831461299884346131229"

typedef void (^UNIAsyncResponse)(UNIHTTPJsonResponse* jsonResponse, NSError* error);

@interface UNIHTTPClientHelper : NSObject

+(UNIHTTPResponse*) requestSync:(UNIHTTPRequest*) request error:(NSError**) error;

+(UNIUrlConnection*) requestAsync:(UNIHTTPRequest*) request handler:(void (^)(UNIHTTPResponse*, NSError*))handler;

@end
