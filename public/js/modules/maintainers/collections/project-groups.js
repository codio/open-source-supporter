/**
 * Created with JetBrains PhpStorm.
 * User: krasu
 * Date: 9/17/13
 * Time: 8:41 AM
 */
define(function (require) {
	require('backbone')

	var Projects = require('./projects')

	return Backbone.Collection.extend({
		url: '/maintaining-projects',
		comparator: function(item) {
			return [!item.get('type'), item.get('username')]
		},
		parse: function (data) {
			var owners = {}

			_.each(data, function (entry) {
				var group = owners[entry.owner.githubId]
				if (!group) {
					group = owners[entry.owner.githubId] = _.clone(entry.owner)
					group.repos = new Projects
				}

				group.repos.push(entry)
			})

			return _.values(owners);
		}
	})
})