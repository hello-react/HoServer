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

#import "UNIUrlConnection.h"

@implementation UNIUrlConnection {
    NSURLConnection *connection;
    NSHTTPURLResponse *response;
    NSMutableData *responseData;
}

@synthesize request, queue, completionHandler;

+ (UNIUrlConnection *)sendAsynchronousRequest:(NSURLRequest *)request queue:(NSOperationQueue *)queue completionHandler:(void(^)(NSURLResponse *response, NSData *data, NSError *error))completionHandler
{
    UNIUrlConnection *result = [[UNIUrlConnection alloc] init];
    result.request = request;
    result.queue = queue;
    result.completionHandler = completionHandler;
    [result start];
    return result;
}

- (void)dealloc
{
    [self cancel];
}

- (void)start
{
    connection = [[NSURLConnection alloc] initWithRequest:request delegate:self startImmediately:NO];
    [connection scheduleInRunLoop:NSRunLoop.mainRunLoop forMode:NSDefaultRunLoopMode];
    if (connection) {
        [connection start];
    } else {
        if (completionHandler) completionHandler(nil, nil, nil); completionHandler = nil;
    }
}

- (void)cancel
{
    [connection cancel]; connection = nil;
    completionHandler = nil;
}

- (void)connection:(NSURLConnection *)_connection didReceiveResponse:(NSHTTPURLResponse *)_response
{
    response = _response;
}

- (void)connection:(NSURLConnection *)_connection didReceiveData:(NSData *)data
{
    if (!responseData) {
        responseData = [NSMutableData dataWithData:data];
    } else {
        [responseData appendData:data];
    }
}

- (void)connectionDidFinishLoading:(NSURLConnection *)_connection
{
    connection = nil;
    if (completionHandler) {
        void(^b)(NSURLResponse *response, NSData *data, NSError *error) = completionHandler;
        completionHandler = nil;
        [queue addOperationWithBlock:^{b(self->response, self->responseData, nil);}];
    }
}

- (void)connection:(NSURLConnection *)_connection didFailWithError:(NSError *)error
{
    connection = nil;
    if (completionHandler) {
        void(^b)(NSURLResponse *response, NSData *data, NSError *error) = completionHandler;
        completionHandler = nil;
        [queue addOperationWithBlock:^{b(self->response, self->responseData, error);}];
    }
}

#if TARGET_IPHONE_SIMULATOR
- (BOOL)connection:(NSURLConnection *)_connection canAuthenticateAgainstProtectionSpace:(NSURLProtectionSpace *)protectionSpace
{
    return [protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust];
}
- (void)connection:(NSURLConnection *)_connection didReceiveAuthenticationChallenge:(NSURLAuthenticationChallenge *)challenge
{
    [challenge.sender useCredential:[NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust] forAuthenticationChallenge:challenge];
}
#endif

@end
