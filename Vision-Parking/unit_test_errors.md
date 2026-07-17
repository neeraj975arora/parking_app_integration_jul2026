# Unit Test Errors Report

## Summary

**Build Status:** FAILED  
**Total Errors:** 21 compilation errors  
**Affected Test File:** `UserVehicleTest.java`  
**Build Tasks Failed:** 
- `:app:compileDebugUnitTestJavaWithJavac`
- `:app:compileReleaseUnitTestJavaWithJavac`

The unit tests are failing due to constructor signature mismatches and missing methods in the `UserVehicle` class. The test file expects different constructors and utility methods that don't exist in the actual implementation.

---

## Full Error Logs

### Constructor Signature Errors (4 instances)

```
C:\Users\Harish\Desktop\parking_app_integration\Vision-Parking\app\src\test\java\com\example\visionpark\UserVehicleTest.java:36: error: no suitable constructor found for UserVehicle(int,String,String,String)
UserVehicle testVehicle = new UserVehicle(1, "ABC-1234", "My Car", "car");
                          ^
    constructor UserVehicle.UserVehicle() is not applicable
        (actual and formal argument lists differ in length)
    constructor UserVehicle.UserVehicle(String,String) is not applicable
        (actual and formal argument lists differ in length)
    constructor UserVehicle.UserVehicle(int,int,String,String,String,String,Integer,String,String) is not applicable
        (actual and formal argument lists differ in length)
```

**Lines affected:** 36, 47, 209, 210

### Missing Method: `getDisplayName()` (4 instances)

```
C:\Users\Harish\Desktop\parking_app_integration\Vision-Parking\app\src\test\java\com\example\visionpark\UserVehicleTest.java:68: error: cannot find symbol
String displayName = vehicle.getDisplayName();
                            ^
  symbol:   method getDisplayName()
  location: variable vehicle of type UserVehicle
```

**Lines affected:** 68, 78, 88, 228

### Missing Method: `getVehicleDetails()` (6 instances)

```
C:\Users\Harish\Desktop\parking_app_integration\Vision-Parking\app\src\test\java\com\example\visionpark\UserVehicleTest.java:98: error: cannot find symbol
String details = vehicle.getVehicleDetails();
                        ^
  symbol:   method getVehicleDetails()
  location: variable vehicle of type UserVehicle
```

**Lines affected:** 98, 108, 116, 123, 238, 248

### Missing Method: `getFormattedVehicleType()` (5 instances)

```
C:\Users\Harish\Desktop\parking_app_integration\Vision-Parking\app\src\test\java\com\example\visionpark\UserVehicleTest.java:130: error: cannot find symbol
assertEquals("Car", vehicle.getFormattedVehicleType());
                           ^
  symbol:   method getFormattedVehicleType()
  location: variable vehicle of type UserVehicle
```

**Lines affected:** 130, 133, 136, 142, 148

### Ambiguous Method Reference (2 instances)

```
C:\Users\Harish\Desktop\parking_app_integration\Vision-Parking\app\src\test\java\com\example\visionpark\UserVehicleTest.java:56: error: reference to assertEquals is ambiguous
    assertEquals(2020, testVehicle.getYear());
    ^
  both method assertEquals(long,long) in Assert and method assertEquals(Object,Object) in Assert match
```

**Lines affected:** 56, 169

---

## Probable Causes

1. **Constructor Mismatch:** The `UserVehicle` class has been refactored with a different constructor signature. Tests expect a 4-parameter constructor `(int, String, String, String)` and an 8-parameter constructor, but the actual class only provides:
   - Default constructor `UserVehicle()`
   - Two-parameter constructor `UserVehicle(String, String)`
   - Nine-parameter constructor `UserVehicle(int, int, String, String, String, String, Integer, String, String)`

2. **Missing Utility Methods:** Three helper methods are missing from the `UserVehicle` class:
   - `getDisplayName()` - likely returns a formatted display name for the vehicle
   - `getVehicleDetails()` - likely returns detailed vehicle information as a string
   - `getFormattedVehicleType()` - likely returns a user-friendly vehicle type string

3. **Type Ambiguity:** The `assertEquals` method is ambiguous when comparing integer values because Java can't determine if `2020` should be treated as `long` or `Object`.

---

## Recommended Fix Steps

### Step 1: Update UserVehicle Class Constructors

Add the missing constructors to `UserVehicle.java`:

```java
// Constructor for tests with 4 parameters
public UserVehicle(int id, String licensePlate, String nickname, String vehicleType) {
    this.id = id;
    this.licensePlate = licensePlate;
    this.nickname = nickname;
    this.vehicleType = vehicleType;
}

// Constructor for tests with 8 parameters
public UserVehicle(int id, String licensePlate, String nickname, String vehicleType, 
                   String make, int year, String model, String color) {
    this.id = id;
    this.licensePlate = licensePlate;
    this.nickname = nickname;
    this.vehicleType = vehicleType;
    this.make = make;
    this.year = year;
    this.model = model;
    this.color = color;
}
```

### Step 2: Add Missing Utility Methods

Add these methods to `UserVehicle.java`:

```java
public String getDisplayName() {
    if (nickname != null && !nickname.isEmpty()) {
        return nickname + " (" + licensePlate + ")";
    }
    return licensePlate;
}

public String getVehicleDetails() {
    StringBuilder details = new StringBuilder();
    if (make != null && !make.isEmpty()) {
        details.append(make);
    }
    if (model != null && !model.isEmpty()) {
        if (details.length() > 0) details.append(" ");
        details.append(model);
    }
    if (year != null && year > 0) {
        if (details.length() > 0) details.append(" ");
        details.append("(" + year + ")");
    }
    if (color != null && !color.isEmpty()) {
        if (details.length() > 0) details.append(" - ");
        details.append(color);
    }
    return details.toString();
}

public String getFormattedVehicleType() {
    if (vehicleType == null) return "Car";
    
    switch (vehicleType.toLowerCase()) {
        case "car":
            return "Car";
        case "motorcycle":
        case "bike":
            return "Motorcycle";
        case "two_wheeler":
            return "Two_wheeler";
        default:
            return "Car";
    }
}
```

### Step 3: Fix assertEquals Ambiguity

In `UserVehicleTest.java`, cast the integer values explicitly:

```java
// Change from:
assertEquals(2020, testVehicle.getYear());

// To:
assertEquals(Integer.valueOf(2020), testVehicle.getYear());
// OR
assertEquals(2020, testVehicle.getYear().intValue());
```

### Step 4: Rebuild and Test

```bash
cd Vision-Parking
.\gradlew.bat clean
.\gradlew.bat test
```

---

## Next Steps

1. Review the `UserVehicle` model class implementation
2. Apply the recommended fixes above
3. Run unit tests again to verify fixes
4. Consider adding null checks and validation in the new methods
5. Update any related documentation or API specs
