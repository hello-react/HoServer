//
//  Constants.m
//
//  Copyright © 2020 Hello React. All rights reserved.
//

#import "Constants.h"

NSString * const SERVER_URL = @"http://192.168.31.108:3001";
NSString * const API_PREFIX = @"/api/v1";

static NSString * _token = @"";

@interface Constants()

@end

@implementation Constants

+(NSString *) token
{
    return _token;
}

+(void) setToken:(NSString *)token
{
    _token = token;
}

@end

