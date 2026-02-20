const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            default: ''
        },
        lastName: {
            type: String,
            default: ''
        },
        email: {
            type: String,
            default: ''
        },
        emailVerified: {
            type: Number,
            enum: [0, 1],
            default: 0
        },
        profileImage: {
            type: String,
            default: ''
        },
        selfieImage: {
            type: String,
            default: ''
        },
        ejamaatImage: {
            type: String,
            default: ''
        },
        phone: {
            type: String,
            default: ''
        },
        otp: {
            type: String,
        },
        otpExpireTime: {
            type: Date,
        },
        countryId: {
            type: String
        },
        telephoneCountry: {
            type: String
        },
        city: {
            type: String
        },
        state: {
            type: String
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
            },
            coordinates: {
                type: [Number],
            }
        },
        address: {
            type: String,
            default: '',
        },
        gender: {
            type: String,
            default: ''
        },
        lookingFor: {
            type: String,
            default: ''
        },
        dob: {
            type: String,
            default: ''
        },
        dateOfBirth: {
            type: Date,
        },
        age: {
            type: String,
            default: ''
        },
        height: {
            type: String,
            default: ''
        },
        heightInInches: {
            type: Number,
            default: 0
        },
        education: {
            type: String,
            default: ''
        },
        profession: {
            type: String,
            default: ''
        },
        maritalStatus: {
            type: String,
            default: ''
        },
        married: {
            type: String,
            default: ''
        },
        religious: {
            type: String,
            default: ''
        },
        kids: {
            type: String,
            default: ''
        },
        wantKids: {
            type: String,
            default: ''
        },
        about: {
            type: String,
            default: ''
        },
        steps: {
            type: Number,
            default: 0
        },
        registrationStatus: {
            type: String,
            enum: ['completed', 'inCompleted'],
            default: 'inCompleted',
        },
        accessToken: {
            type: String,
            default: ''
        },
        token: {
            type: String,
            default: ''
        },
        deviceType: {
            type: String,
            enum: ['android', 'ios'],
        },
        notificationAllow: {
            type: String,
            enum: ['true', 'false'],
            default: ''
        },
        isSubcription: {
            type: Boolean,
            enum: [true, false],
            default: false
        },
        isOnline: {
            type: Boolean,
            enum: [true, false],
            default: false
        },
        socketId: {
            type: String,
            default: ''
        },
        isChatContinue: {
            type: Boolean,
            enum: [true, false],
            default: false
        },
        reportCount: {
            type: Number,
            default: 0,
        },
        isActived: {
            type: Number,
            enum: [0, 1],
            default: 1,
        },
        isDeleted: {
            type: Number,
            enum: [0, 1],
            default: 0,
        },
        isBlocked: {
            type: Number,
            enum: [0, 1],
            default: 0,
        },
        goToHome: {
            type: Boolean,
            enum: [true, false],
            default: false
        },
        lastLogin: {
            type: Date,
        },
        verifyBadge: {
            type: Number,
            enum: [0, 1, 2],
            default: 0
        },
        imageVerificationStatus: {
            type: String,
            enum: ["notStarted", "scanned", "completed", "error"],
            default: "notStarted",
        },
        selfieImageVerificationStatus: {
            type: String,
            enum: ["notStarted", "scanned", "completed", "error"],
            default: "notStarted",
        },
        ejamaatImageVerificationStatus: {
            type: String,
            enum: ["notStarted", "scanned", "completed", "error"],
            default: "notStarted",
        },
        password: {
            type: String,
        },
        isVisible: {
            type: Boolean,
            enum: [true, false],
            default: false
        },
        
        deletedBy: {
            type: String,
            default: null
        },
        deleteReason: {
            type: String,
            default: null
        },
        deletedAt: {
            type: Date,
            default: null   
        },
        deactivateAccount: {
            type: Number,
            enum: [0, 1],
            default: 0
        },
        privacyLocked: {
            type: Number,
            enum: [0,1],
            default: 0, //? 0: false, 1: true
        },
        deactivateAccountAt: {
            type: Date,
            default: null   
        },
        subscriptionEndDate:{
            type: Date,
            default: null
        }
    },
    {timestamps: true}
);

userSchema.index({location: "2dsphere"});

module.exports = mongoose.model("Users", userSchema);
