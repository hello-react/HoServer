//
//  Callback.h
//
//  Copyright © 2020 Hello React. All rights reserved.
//

#ifndef Callback_h
#define Callback_h

#import <Foundation/Foundation.h>
#import "../Unirest/UNIRest.h"

typedef void (^JsonResponseCallback)(UNIHTTPJsonResponse* jsonResponse, UNIJsonNode *body, NSError* error);

#endif /* Callback_h */
