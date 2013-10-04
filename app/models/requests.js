/**
 * Author: krasu
 * Date: 9/18/13
 * Time: 14:21 AM
 */
var mongoose = require('mongoose'),
    async = require('async'),
    _ = require('lodash'),
    notifier = require('../utils/requests-notifications'),
    Schema = mongoose.Schema

var RequesterSchema = new Schema({
    request: {type: Schema.ObjectId, ref: 'Request'},
    ref: {type: Schema.ObjectId, ref: 'User'},
    username: {type: String, trim: true },
    email: {type: String, trim: true },
    isAnon: {type: Boolean, default: false},
    ip: {type: String, trim: true }
})
mongoose.model('Requester', RequesterSchema)

var RequestSchema = new Schema({
    supporters: [
        {type: Schema.ObjectId, ref: 'Requester'}
    ],

    project: {
        ref: {type: Schema.ObjectId, ref: 'Project'},
        githubId: {type: Number},
        methodsSet: {type: Boolean, default: false},
        methodsSetAt: Date
    },

    maintainer: {
        user: {type: Schema.ObjectId, ref: 'User'},
        org: {type: Schema.ObjectId, ref: 'Organization'},
        name: {type: String, trim: true },
        email: {type: String, trim: true },
        notified: {type: Boolean, default: false},
        notifiedAt: Date
    },

    satisfied: {type: Boolean, default: false},
    updatedAt: Date,
    createdAt: Date
})


RequestSchema.pre('save', function (next) {
    if (!this.created_at) this.created_at = new Date;
    if (this.maintainer) {
        if (this.maintainer.notified && !this.maintainer.notifiedAt) {
            this.maintainer.notifiedAt = new Date
        }
    }
    next();
});

RequestSchema.statics.satisfy = function (project, cb) {
    if (!project.hasDonateMethods()) return cb('No donate methods')
    notifier.notifyRequesters(project, cb)
}

RequestSchema.statics.request = function (user, project, ip, altEmail, cb) {
    var Requester = mongoose.model('Requester')
    var self = this
    var isAnon = !user
    var request = {
        project: {
            ref: project._id,
            githubId: project.githubId,
            methodsSet: project.hasDonateMethods()
        },
        maintainer: {
            name: project.owner.username,
            notified: false
        }
    }
    var supporter = {
        ref: !isAnon && user._id,
        username: !isAnon && user.username,
        email: (!isAnon && user.email) || altEmail,
        isAnon: isAnon,
        ip: ip
    }

    if (project.owner.user) request.maintainer.user = project.owner.user
    if (project.owner.org) request.maintainer.org = project.owner.org

    async.series([
        function (callback) {
            project.getOwner(function (error, owner) {
                if (error) return callback(error)
                if (owner) request.maintainer.email = owner.email
                callback()
            })
        },
        function (callback) {
            self.findOneAndUpdate({'project.ref': project._id, satisfied: false},
                request, {upsert: true}, function (error, entry) {
                    error && console.error(error)
                    if (error) return callback('Server error')
                    request = entry
                    callback()
                })
        },
        function (callback) {
            var query = {request: request._id}
            _.merge(supporter, {request: request._id})

            if (isAnon) {
                query.isAnon = true
                query.ip = ip
            } else {
                query.ref = user._id
            }

            Requester.findOne(query, function (error, entry) {
                if (error) return callback('Server error')
                if (entry) return callback('You already sent request for this project')

                Requester.create(supporter, function(err, requester) {
                    request.supporters.push(requester)
                    callback(err, requester)
                })
            })
        },
        function (callback) {
            if (!request.maintainer.email) {
                return notifier.notifySupport(request, project, user, callback)
            } else {
                notifier.notifyMaintainer(request, project, user, callback)
            }
        }
    ], function (error) {
        if (error) return cb(error)

        if (request.maintainer.email) {
            request.maintainer.notified = !!request.maintainer.email
        }

        request.updatedAt = new Date
        request.save(cb)
    })
}

mongoose.model('Request', RequestSchema)