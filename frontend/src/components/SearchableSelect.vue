<template>
  <div class="searchable-select">
    <input
      :id="inputId"
      :value="query"
      type="text"
      class="form-control"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="activeOptionId"
      @focus="openOptions"
      @input="onInput"
      @keydown.down.prevent="moveActive(1)"
      @keydown.up.prevent="moveActive(-1)"
      @keydown.enter.prevent="selectActive"
      @keydown.esc="open = false"
      @blur="closeOptions"
    >

    <div v-if="open" :id="listId" class="searchable-options" role="listbox">
      <button
        v-for="(option, index) in filteredOptions"
        :id="optionId(index)"
        :key="String(option.value)"
        type="button"
        role="option"
        :aria-selected="String(option.value) === String(modelValue)"
        :class="{ active: index === activeIndex }"
        @mousedown.prevent="selectOption(option)"
        @mouseenter="activeIndex = index"
      >
        {{ option.label }}
      </button>
      <div v-if="filteredOptions.length === 0" class="searchable-empty">
        No matching options.
      </div>
    </div>
  </div>
</template>

<script>
let nextSearchableSelectId = 0

export default {
  name: 'SearchableSelect',

  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    options: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: 'Search or select'
    },
    required: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    inputId: {
      type: String,
      default: ''
    }
  },

  emits: ['update:modelValue'],

  data() {
    return {
      id: ++nextSearchableSelectId,
      query: '',
      open: false,
      activeIndex: 0,
      editing: false
    }
  },

  computed: {
    normalizedOptions() {
      const options = this.options.map(option => {
        if (typeof option === 'string' || typeof option === 'number') {
          return { value: option, label: String(option) }
        }

        return {
          value: option.value,
          label: String(option.label ?? option.value ?? '')
        }
      }).filter(option => option.value !== undefined && option.value !== null)

      if (
        this.modelValue !== '' &&
        !options.some(option => String(option.value) === String(this.modelValue))
      ) {
        options.push({
          value: this.modelValue,
          label: String(this.modelValue)
        })
      }

      return options
    },

    selectedLabel() {
      return this.normalizedOptions.find(
        option => String(option.value) === String(this.modelValue)
      )?.label || ''
    },

    filteredOptions() {
      const search = this.query.trim().toLocaleLowerCase()

      if (!search || (!this.editing && this.modelValue !== '')) {
        return this.normalizedOptions
      }

      return this.normalizedOptions.filter(option =>
        option.label.toLocaleLowerCase().includes(search)
      )
    },

    listId() {
      return `searchable-select-list-${this.id}`
    },

    activeOptionId() {
      return this.filteredOptions.length
        ? this.optionId(this.activeIndex)
        : undefined
    }
  },

  watch: {
    modelValue() {
      if (!this.editing) {
        this.query = this.selectedLabel
      }
    },

    selectedLabel(value) {
      if (!this.editing) {
        this.query = value
      }
    }
  },

  mounted() {
    this.query = this.selectedLabel
  },

  methods: {
    optionId(index) {
      return `${this.listId}-option-${index}`
    },

    openOptions() {
      if (!this.editing) {
        this.query = this.selectedLabel
      }

      this.open = true
      this.activeIndex = 0
    },

    onInput(event) {
      this.query = event.target.value
      this.editing = true
      this.open = true
      this.activeIndex = 0
      this.$emit('update:modelValue', '')
      event.target.setCustomValidity(
        this.query.trim()
          ? 'Choose an option from the list.'
          : this.required
            ? 'Select an option from the list.'
            : ''
      )
    },

    selectOption(option) {
      this.query = option.label
      this.editing = false
      this.open = false
      this.$emit('update:modelValue', option.value)
      const input = this.$el.querySelector('input')
      input?.setCustomValidity('')
    },

    moveActive(direction) {
      this.open = true
      const optionCount = this.filteredOptions.length
      if (!optionCount) return

      this.activeIndex = (this.activeIndex + direction + optionCount) % optionCount
    },

    selectActive() {
      const option = this.filteredOptions[this.activeIndex]
      if (option) this.selectOption(option)
    },

    closeOptions() {
      setTimeout(() => {
        this.open = false
        if (!this.editing) {
          this.query = this.selectedLabel
        }
      }, 120)
    }
  }
}
</script>

<style scoped>
.searchable-select {
  position: relative;
}

.searchable-options {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 1060;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  background: #fff;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, .12);
}

.searchable-options button {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 0;
  background: #fff;
  color: #212529;
  text-align: left;
}

.searchable-options button:hover,
.searchable-options button.active {
  background: #f1f5f2;
}

.searchable-empty {
  padding: 0.5rem 0.75rem;
  color: #6c757d;
}
</style>
