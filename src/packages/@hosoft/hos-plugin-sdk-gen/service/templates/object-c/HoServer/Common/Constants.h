//
//  Constants.h
//
//  Copyright © 2020 Hello React. All rights reserved.
//

#ifndef Constants_h
#define Constants_h

#import <Foundation/Foundation.h>

// Server Url
extern NSString * const SERVER_URL;

// Api prefix
extern NSString * const API_PREFIX;

@interface Constants : NSObject
{
}

+(NSString *) token;
+(void) setToken:(NSString *)token;

@end

#endif /* Constants_h */
