#import <Contacts/CNContactStore.h>
#import <Contacts/CNContact.h>
#import <Contacts/CNContactFetchRequest.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        CNContactStore *store = [[CNContactStore alloc] init];

        // Request all relevant keys for properties
        NSArray *keysToFetch = @[
            CNContactIdentifierKey,
            CNContactGivenNameKey,
            CNContactFamilyNameKey,
            CNContactMiddleNameKey,
            CNContactNamePrefixKey,
            CNContactNameSuffixKey,
            CNContactNicknameKey,
            CNContactPhoneticGivenNameKey,
            CNContactPhoneticMiddleNameKey,
            CNContactPhoneticFamilyNameKey,
            CNContactOrganizationNameKey,
            CNContactDepartmentNameKey,
            CNContactJobTitleKey,
            CNContactBirthdayKey,
            CNContactNonGregorianBirthdayKey,
            CNContactNoteKey,
            CNContactImageDataKey,
            CNContactThumbnailImageDataKey,
            CNContactPhoneNumbersKey,
            CNContactEmailAddressesKey,
            CNContactPostalAddressesKey,
            CNContactDatesKey,
            CNContactUrlAddressesKey,
            CNContactSocialProfilesKey,
            CNContactInstantMessageAddressesKey,
            CNContactRelationsKey
        ];

        CNContactFetchRequest *request = [[CNContactFetchRequest alloc] initWithKeysToFetch:keysToFetch];

        NSMutableArray *jsonArray = [[NSMutableArray alloc] init];
        NSError *error = nil;

        [store enumerateContactsWithFetchRequest:request error:&error usingBlock:^(CNContact *contact, BOOL *stop) {
            if (error) {
                NSLog(@"Failed to fetch contacts: %@", error);
                return;
            }

            NSMutableDictionary *contactDict = [[NSMutableDictionary alloc] init];

            for (NSString *key in keysToFetch) {
                @try {
                    id value = [contact valueForKey:key];

                    if ([value isKindOfClass:[CNPhoneNumber class]]) {
                        CNPhoneNumber *phoneNumber = (CNPhoneNumber *)value;
                        contactDict[key] = phoneNumber.stringValue;
                    } else if ([value isKindOfClass:[NSArray class]]) {
                        NSMutableArray *arrayValues = [[NSMutableArray alloc] init];
                        for (id item in (NSArray *)value) {
                            if ([item isKindOfClass:[CNLabeledValue class]]) {
                                [arrayValues addObject:@{
                                    @"label": [(CNLabeledValue *)item label] ?: @"",
                                    @"value": [(CNLabeledValue *)item value] ?: @""
                                }];
                            } else {
                                [arrayValues addObject:item];
                            }
                        }
                        contactDict[key] = arrayValues;
                    } else if (value) {
                        contactDict[key] = value;
                    } else {
                        contactDict[key] = [NSNull null];
                    }
                } @catch (NSException *exception) {
                    NSLog(@"Error accessing property %@: %@", key, exception.reason);
                }
            }

            [jsonArray addObject:contactDict];
        }];

        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:jsonArray options:NSJSONWritingPrettyPrinted error:nil];
        NSLog(@"%@", [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding]);
    }
    return 0;
}
