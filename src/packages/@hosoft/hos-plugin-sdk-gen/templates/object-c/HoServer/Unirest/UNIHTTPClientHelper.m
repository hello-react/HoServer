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

#import "UNIHTTPClientHelper.h"
#import "Base64.h"
#import "UNIRest.h"

@interface UNIHTTPClientHelper()
+ (NSString*) encodeURI:(NSString*)value;
+ (NSString*) dictionaryToQuerystring:(NSDictionary*) parameters;
+ (BOOL) hasBinaryParameters:(NSDictionary*) parameters;
+ (NSMutableURLRequest*) prepareRequest:(UNIHTTPRequest*) request;
+ (UNIHTTPResponse*) getResponse:(NSURLResponse*) response data:(NSData*) data;
@end

@implementation UNIHTTPClientHelper

+ (BOOL) hasBinaryParameters:(NSDictionary*) parameters {
    for(id key in parameters) {
        id value = [parameters objectForKey:key];
        if ([value isKindOfClass:[NSURL class]]) {
            return true;
        }
    }
    return false;
}

+ (NSString*) encodeURI:(NSString*)value {
	NSString* result = (NSString *)CFBridgingRelease(CFURLCreateStringByAddingPercentEscapes(
                                                                                             NULL,
                                                                                             (CFStringRef)value,
                                                                                             NULL,
                                                                                             (CFStringRef)@"!*'();:@&=+$,/?%#[]",
                                                                                             kCFStringEncodingUTF8));
	return result;
}

+ (NSString*) dictionaryToQuerystring:(NSDictionary*) parameters {
    NSString* result = @"";
    
    BOOL firstParameter = YES;
    for(id key in parameters) {
        id value = [parameters objectForKey:key];
        if (!([value isKindOfClass:[NSURL class]] || value == nil)) { // Don't encode files and null values
            NSString* parameter = [NSString stringWithFormat:@"%@%@%@", [UNIHTTPClientHelper encodeURI:key], @"=", [UNIHTTPClientHelper encodeURI:value]];
            if (firstParameter) {
                result = [NSString stringWithFormat:@"%@%@", result, parameter];
            } else {
                result = [NSString stringWithFormat:@"%@&%@", result, parameter];
            }
            firstParameter = NO;
        }
    }
    
    return result;
}

+ (NSMutableURLRequest*) prepareRequest:(UNIHTTPRequest*) request {
    UNIHTTPMethod httpMethod = [request httpMethod];
    NSMutableDictionary* headers = [[request headers] mutableCopy];
    
    NSString* url = [request url];
    
    if (httpMethod == GET) {
        UNISimpleRequest* simpleRequest = (UNISimpleRequest*) request;
        NSDictionary* parameters = [simpleRequest parameters];
        if ([parameters count] > 0) {
            // Add additional parameters if any
            NSMutableString* finalUrl = [[NSMutableString alloc] initWithString:url];
            if([url rangeOfString:@"?"].location == NSNotFound) {
                [finalUrl appendString:@"?"];
            } else {
                [finalUrl appendString:@"&"];
            }
            
            [finalUrl appendString:[self dictionaryToQuerystring:parameters]];
            url = [NSString stringWithString:finalUrl];
        }
    }

    NSMutableURLRequest *requestObj = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:url] cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:[UNIRest timeout]];
    NSMutableData* body = [[NSMutableData alloc] init];
    
    if (httpMethod != GET) {
        // Add body
        UNIHTTPRequestWithBody* requestWithBody = (UNIHTTPRequestWithBody*) request;
        
        if ([requestWithBody body] == nil) {
            // Has parameters
            NSDictionary* parameters = [requestWithBody parameters];
            bool isBinary = [UNIHTTPClientHelper hasBinaryParameters:parameters];
            if (isBinary) {
                
                [headers setObject:[NSString stringWithFormat:@"multipart/form-data; boundary=%@", BOUNDARY] forKey:@"content-type"];
                
                for(id key in parameters) {
                    id value = [parameters objectForKey:key];
                    if ([value isKindOfClass:[NSURL class]] && value != nil) { // Don't encode files and null values
                        [body appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n", BOUNDARY] dataUsingEncoding:NSUTF8StringEncoding]];
                        NSString* filename = [[value absoluteString] lastPathComponent];
                        
                        NSData* data = [NSData dataWithContentsOfURL:value];
                        
                        [body appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"; filename=\"%@\"\r\n", key, filename] dataUsingEncoding:NSUTF8StringEncoding]];
                        [body appendData:[[NSString stringWithFormat:@"Content-Length: %d\r\n\r\n", data.length] dataUsingEncoding:NSUTF8StringEncoding]];
                        [body appendData:data];
                    } else {
                        [body appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n", BOUNDARY] dataUsingEncoding:NSUTF8StringEncoding]];
                        [body appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"\r\n\r\n", key] dataUsingEncoding:NSUTF8StringEncoding]];
                        [body appendData:[[NSString stringWithFormat:@"%@", value] dataUsingEncoding:NSUTF8StringEncoding]];
                    }
                }
                
                // Close
                [body appendData:[[NSString stringWithFormat:@"\r\n--%@--\r\n", BOUNDARY] dataUsingEncoding:NSUTF8StringEncoding]];
            } else {
                NSString* querystring = [UNIHTTPClientHelper dictionaryToQuerystring:parameters];
                body = [NSMutableData dataWithData:[querystring dataUsingEncoding:NSUTF8StringEncoding]];
                
                [headers setValue:@"application/x-www-form-urlencoded" forKey:@"content-type"];
            }
        } else {
            // Has a body
            body = [NSMutableData dataWithData:[requestWithBody body]];
        }
        
        [requestObj setHTTPBody:body];
    }
    
    // Set method
    switch ([request httpMethod]) {
        case GET:
            [requestObj setHTTPMethod:@"GET"];
            break;
        case POST:
            [requestObj setHTTPMethod:@"POST"];
            break;
        case PUT:
            [requestObj setHTTPMethod:@"PUT"];
            break;
        case DELETE:
            [requestObj setHTTPMethod:@"DELETE"];
            break;
        case PATCH:
            [requestObj setHTTPMethod:@"PATCH"];
            break;
    }
    
    // Add headers
    [headers setValue:@"unirest-objc/1.1" forKey:@"user-agent"];
    [headers setValue:@"gzip" forKey:@"accept-encoding"];
    
    // Add cookies to the headers
    [headers setValuesForKeysWithDictionary:[NSHTTPCookie requestHeaderFieldsWithCookies:[[NSHTTPCookieStorage sharedHTTPCookieStorage] cookiesForURL:[NSURL URLWithString:url]]]];
    
    // Basic Auth
    if ([request username] != nil || [request password] != nil) {
        NSString* user = ([request username] == nil) ? @"" : [request username];
        NSString* pass = ([request password] == nil) ? @"" : [request password];
        NSString *credentials = [NSString stringWithFormat: @"%@:%@", user, pass];

        NSString* header = [NSString stringWithFormat:@"Basic %@", [Base64 base64String:credentials]];
        [headers setValue:header forKey:@"authorization"];
    }
    
    // Default headers
    NSMutableDictionary* defaultHeaders = [UNIRest defaultHeaders];
    for(NSString* key in defaultHeaders) {
        NSString *value = [defaultHeaders objectForKey:key];
        [requestObj addValue:value forHTTPHeaderField:key];
    }
    
    for (NSString *key in headers) {
        NSString *value = [headers objectForKey:key];
        [requestObj addValue:value forHTTPHeaderField:key];
    }
    return requestObj;
}

+(UNIHTTPResponse*) requestSync:(UNIHTTPRequest*) request error:(NSError**) error {
    NSMutableURLRequest* requestObj = [self prepareRequest:request];
    
    NSHTTPURLResponse * response = nil;
    NSData * data = [NSURLConnection sendSynchronousRequest:requestObj returningResponse:&response error:error];
    return [self getResponse:response data:data];
}

+(UNIUrlConnection*) requestAsync:(UNIHTTPRequest*) request handler:(void (^)(UNIHTTPResponse*, NSError*))handler {
    NSMutableURLRequest* requestObj = [self prepareRequest:request];
    NSOperationQueue *mainQueue = [[NSOperationQueue alloc] init];
    
    UNIUrlConnection* connection = [UNIUrlConnection sendAsynchronousRequest:requestObj queue:mainQueue completionHandler:^(NSURLResponse *response, NSData *data, NSError *connectionError) {
        
        UNIHTTPResponse* res = [self getResponse:response data:data];
        handler(res, connectionError);
 
    }];
    
    return connection;
}

+ (UNIHTTPResponse*) getResponse:(NSURLResponse*) response data:(NSData*) data {
    if (data == nil) {
        return nil;
    }
    
    NSHTTPURLResponse* httpResponse = (NSHTTPURLResponse*) response;
    
    UNIHTTPResponse* res = [[UNIHTTPResponse alloc] init];
    [res setCode:[httpResponse statusCode]];
    [res setHeaders:[httpResponse allHeaderFields]];
    [res setRawBody:data];
    
    return res;
}

@end
