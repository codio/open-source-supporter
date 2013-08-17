/**
 * Created with JetBrains PhpStorm.
 * User: krasu
 * Date: 8/13/13
 * Time: 1:29 AM
 */
define(function (require) {
	require('backbone')
	var store = require('store').getNamespace('repo-selector')
	var tpl = require('tpl!../templates/repo-row.html')

	return Backbone.View.extend({
		initialize: function (options) {
			this.listenTo(store().hub, 'changed:' + this.model.id, this.renderSupportChange)
			this.listenTo(store().hub, 'removed:' + this.model.id, this.removeSupport)
		},
		attributes: {
			class: 'repo row'
		},
		events: {
			'click .support-type': 'toggleSupport',
			'click .remove-icon': 'removeProject'
		},
		removeProject: function () {
			this.model.destroy()
			this.remove()
			store().hub.trigger('removed:' + this.model.id)
		},
		renderSupportChange: function (type, value) {
			this.$('.support-type.' + type).toggleClass('active', value)
			this.model.get('support').set(type, value)

			if (this.model.isProject && this.model.get('support').isEmpty()) {
				this.model.destroy()
				this.remove()
			}
		},
		removeSupport: function () {
			this.$('.support-type').toggleClass('active', false)
			this.model.get('support').clear()
		},
		toggleSupportByType: function (type, value) {
			var support = this.model.get('support'),
				val = typeof value === 'undefined' ? !support.get(type) : value,
				alert = 'If you do not check any icons, this item will be removed. OK?'

			if (!val && this.model.isProject && this.model.get('support').count() == 1 && !confirm(alert)) {
				return
			}

			support.set(type, val)

			store().hub.trigger('changed:' + this.model.id, type, this.model.get('support').get(type))

			if (!this.options.isProject && !this.model.get('support').isEmpty()
				&& !store().selected.get(this.model.id)
				) {
				store().selected.add(this.model.toJSON(), {parse: true})
			}
		},
		toggleSupport: function (event) {
				this.toggleSupportByType($(event.currentTarget).data().type)
		},
		render: function () {
			this.model.get('fork') && this.$el.addClass('fork')
			this.$el.html(tpl({
				repo: this.model.toJSON(),
				canDelete: this.model.isProject
			}))
			return this
		}
	});
})