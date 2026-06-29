import os
import re

file_path = 'C:/Users/admin/.cc-connect/ccm/frontend/src/components/SystemDiagnostics.vue'
template_path = 'C:/Users/admin/.cc-connect/ccm/scratch/new_template.html'
style_path = 'C:/Users/admin/.cc-connect/ccm/scratch/new_style.css'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

with open(template_path, 'r', encoding='utf-8') as f:
    new_template = f.read()

with open(style_path, 'r', encoding='utf-8') as f:
    new_style = f.read()

# Add showAdvanced to script setup
content = content.replace(
    "const inferredVerificationApplyLoading = ref(false)",
    "const inferredVerificationApplyLoading = ref(false)\nconst showAdvanced = ref(false)"
)

# Replace <template> ... </template>
content = re.sub(r'<template>.*?</template>', new_template, content, flags=re.DOTALL)

# Replace <style scoped> ... </style>
content = re.sub(r'<style scoped>.*?</style>', new_style, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactoring completed successfully.")
