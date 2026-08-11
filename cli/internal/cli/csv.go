package cli

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

var jsonNumberPattern = regexp.MustCompile(`^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$`)

type csvFieldDescriptor struct {
	identity     string
	key          string
	label        string
	missingIndex int
	column       string
}

type csvSchema struct {
	topKeys     []string
	descriptors []*csvFieldDescriptor
}

// buildCSVSchema freezes the header from the first page plus board field
// definitions. Later pages are rendered against this schema and cannot grow
// the retained header or force a full export pre-scan.
func buildCSVSchema(items []map[string]any, board any) csvSchema {
	topSet := map[string]struct{}{}
	descriptors := map[string]*csvFieldDescriptor{}
	if record, ok := board.(map[string]any); ok {
		if fields, ok := record["fields"].([]any); ok {
			for _, value := range fields {
				field, ok := value.(map[string]any)
				if !ok {
					continue
				}
				registerCSVDescriptor(field, descriptors)
			}
		}
	}
	for _, item := range items {
		for key := range item {
			if key != "fields" {
				topSet[key] = struct{}{}
			}
		}
		collectCSVFieldValues(item, descriptors)
	}
	return finalizeCSVSchema(topSet, descriptors)
}

func renderCSVHeader(schema csvSchema) ([]byte, error) {
	row := append(append([]string{}, schema.topKeys...), csvDescriptorColumns(schema.descriptors)...)
	return renderCSVRecord(row)
}

func renderCSVRow(item map[string]any, schema csvSchema, safety string) ([]byte, error) {
	descriptors := cloneCSVDescriptors(schema.descriptors)
	values := collectCSVFieldValues(item, descriptors)
	row := make([]string, 0, len(schema.topKeys)+len(schema.descriptors))
	for _, key := range schema.topKeys {
		value, err := formatCSVCell(item[key], safety)
		if err != nil {
			return nil, err
		}
		row = append(row, value)
	}
	for _, descriptor := range schema.descriptors {
		value, err := formatCSVCell(values[descriptor.identity], safety)
		if err != nil {
			return nil, err
		}
		row = append(row, value)
	}
	return renderCSVRecord(row)
}

func renderCSVRecord(row []string) ([]byte, error) {
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	if err := writer.Write(row); err != nil {
		return nil, err
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func registerCSVDescriptor(field map[string]any, descriptors map[string]*csvFieldDescriptor) {
	key, _ := field["key"].(string)
	label := csvFieldLabel(field)
	if label == "" {
		return
	}
	identity := "key:" + key
	if key == "" {
		identity = "missing:" + label + ":" + strconv.Itoa(nextMissingCSVIndex(label, descriptors))
	}
	if _, exists := descriptors[identity]; !exists {
		descriptors[identity] = &csvFieldDescriptor{identity: identity, key: key, label: label}
	}
}

func nextMissingCSVIndex(label string, descriptors map[string]*csvFieldDescriptor) int {
	max := 0
	prefix := "missing:" + label + ":"
	for identity := range descriptors {
		if !strings.HasPrefix(identity, prefix) {
			continue
		}
		value, err := strconv.Atoi(strings.TrimPrefix(identity, prefix))
		if err == nil && value > max {
			max = value
		}
	}
	return max + 1
}

func finalizeCSVSchema(topSet map[string]struct{}, descriptorByIdentity map[string]*csvFieldDescriptor) csvSchema {
	topKeys := sortedSetKeys(topSet)
	descriptors := make([]*csvFieldDescriptor, 0, len(descriptorByIdentity))
	for _, descriptor := range descriptorByIdentity {
		descriptors = append(descriptors, descriptor)
	}
	sort.Slice(descriptors, func(i, j int) bool {
		if descriptors[i].label != descriptors[j].label {
			return descriptors[i].label < descriptors[j].label
		}
		return descriptors[i].identity < descriptors[j].identity
	})

	missingIndex := 0
	labelCounts := map[string]int{}
	for _, descriptor := range descriptors {
		labelCounts[descriptor.label]++
		if descriptor.key == "" {
			missingIndex++
			descriptor.missingIndex = missingIndex
		}
	}
	used := map[string]struct{}{}
	for _, key := range topKeys {
		used[key] = struct{}{}
	}
	for _, descriptor := range descriptors {
		base := descriptor.label
		_, topCollision := topSet[descriptor.label]
		if topCollision || labelCounts[descriptor.label] > 1 {
			if descriptor.key != "" {
				base = fmt.Sprintf("%s [%s]", descriptor.label, descriptor.key)
			} else {
				base = fmt.Sprintf("%s [#%d]", descriptor.label, descriptor.missingIndex)
			}
		}
		descriptor.column = uniqueCSVColumn(base, used)
		used[descriptor.column] = struct{}{}
	}
	return csvSchema{topKeys: topKeys, descriptors: descriptors}
}

func csvDescriptorColumns(descriptors []*csvFieldDescriptor) []string {
	columns := make([]string, 0, len(descriptors))
	for _, descriptor := range descriptors {
		columns = append(columns, descriptor.column)
	}
	return columns
}

func cloneCSVDescriptors(descriptors []*csvFieldDescriptor) map[string]*csvFieldDescriptor {
	cloned := make(map[string]*csvFieldDescriptor, len(descriptors))
	for _, descriptor := range descriptors {
		copy := *descriptor
		cloned[descriptor.identity] = &copy
	}
	return cloned
}

func renderItemsCSV(items []map[string]any, safety string) (string, error) {
	if len(items) == 0 {
		return "", nil
	}

	topSet := map[string]struct{}{}
	descriptorByIdentity := map[string]*csvFieldDescriptor{}
	fieldValues := make([]map[string]any, len(items))
	for index, item := range items {
		for key := range item {
			if key != "fields" {
				topSet[key] = struct{}{}
			}
		}
		fieldValues[index] = collectCSVFieldValues(item, descriptorByIdentity)
	}
	topKeys := sortedSetKeys(topSet)

	descriptors := make([]*csvFieldDescriptor, 0, len(descriptorByIdentity))
	for _, descriptor := range descriptorByIdentity {
		descriptors = append(descriptors, descriptor)
	}
	sort.Slice(descriptors, func(i, j int) bool {
		if descriptors[i].label != descriptors[j].label {
			return descriptors[i].label < descriptors[j].label
		}
		return descriptors[i].identity < descriptors[j].identity
	})

	missingIndex := 0
	labelCounts := map[string]int{}
	for _, descriptor := range descriptors {
		labelCounts[descriptor.label]++
		if descriptor.key == "" {
			missingIndex++
			descriptor.missingIndex = missingIndex
		}
	}
	used := map[string]struct{}{}
	for _, key := range topKeys {
		used[key] = struct{}{}
	}
	for _, descriptor := range descriptors {
		base := descriptor.label
		_, topCollision := topSet[descriptor.label]
		if topCollision || labelCounts[descriptor.label] > 1 {
			if descriptor.key != "" {
				base = fmt.Sprintf("%s [%s]", descriptor.label, descriptor.key)
			} else {
				base = fmt.Sprintf("%s [#%d]", descriptor.label, descriptor.missingIndex)
			}
		}
		descriptor.column = uniqueCSVColumn(base, used)
		used[descriptor.column] = struct{}{}
	}

	header := append([]string{}, topKeys...)
	for _, descriptor := range descriptors {
		header = append(header, descriptor.column)
	}
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	if err := writer.Write(header); err != nil {
		return "", err
	}
	for index, item := range items {
		row := make([]string, 0, len(header))
		for _, key := range topKeys {
			value, err := formatCSVCell(item[key], safety)
			if err != nil {
				return "", err
			}
			row = append(row, value)
		}
		for _, descriptor := range descriptors {
			value, err := formatCSVCell(fieldValues[index][descriptor.identity], safety)
			if err != nil {
				return "", err
			}
			row = append(row, value)
		}
		if err := writer.Write(row); err != nil {
			return "", err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return "", err
	}
	return buffer.String(), nil
}

func collectCSVFieldValues(item map[string]any, descriptors map[string]*csvFieldDescriptor) map[string]any {
	values := map[string]any{}
	missingOccurrences := map[string]int{}
	fields, _ := item["fields"].([]any)
	for _, value := range fields {
		field, ok := value.(map[string]any)
		if !ok {
			continue
		}
		key, _ := field["key"].(string)
		label := csvFieldLabel(field)
		if label == "" {
			continue
		}
		identity := "key:" + key
		if key == "" {
			missingOccurrences[label]++
			identity = fmt.Sprintf("missing:%s:%d", label, missingOccurrences[label])
		}
		if _, exists := descriptors[identity]; !exists {
			descriptors[identity] = &csvFieldDescriptor{identity: identity, key: key, label: label}
		}
		if _, exists := values[identity]; !exists {
			values[identity] = field["value"]
		}
	}
	return values
}

func csvFieldLabel(field map[string]any) string {
	for _, key := range []string{"name", "title", "key"} {
		if value, ok := field[key].(string); ok && value != "" {
			return value
		}
	}
	return ""
}

func uniqueCSVColumn(base string, used map[string]struct{}) string {
	if _, exists := used[base]; !exists {
		return base
	}
	for index := 1; ; index++ {
		candidate := fmt.Sprintf("%s [#%d]", base, index)
		if _, exists := used[candidate]; !exists {
			return candidate
		}
	}
}

func formatCSVCell(value any, safety string) (string, error) {
	if value == nil {
		return "", nil
	}
	if text, ok := value.(string); ok {
		if safety == "spreadsheet" {
			text = protectSpreadsheetString(text)
		}
		return text, nil
	}
	return canonicalJSON(value)
}

func protectSpreadsheetString(value string) string {
	if value == "" {
		return value
	}
	if value[0] == '\t' || value[0] == '\r' || value[0] == '\n' {
		return "'" + value
	}
	trimmed := strings.TrimLeft(value, " \t")
	if trimmed != "" && strings.ContainsRune("=+-@", rune(trimmed[0])) {
		return "'" + value
	}
	return value
}

func canonicalJSON(value any) (string, error) {
	var buffer bytes.Buffer
	if err := writeCanonicalJSON(&buffer, value); err != nil {
		return "", err
	}
	return buffer.String(), nil
}

func writeCanonicalJSON(buffer *bytes.Buffer, value any) error {
	switch typed := value.(type) {
	case nil:
		buffer.WriteString("null")
	case string:
		encoded, _ := json.Marshal(typed)
		buffer.Write(encoded)
	case bool:
		if typed {
			buffer.WriteString("true")
		} else {
			buffer.WriteString("false")
		}
	case json.Number:
		if !jsonNumberPattern.MatchString(typed.String()) {
			return fmt.Errorf("invalid JSON number %q", typed)
		}
		buffer.WriteString(typed.String())
	case float64, float32, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return err
		}
		buffer.Write(encoded)
	case []any:
		buffer.WriteByte('[')
		for index, entry := range typed {
			if index > 0 {
				buffer.WriteByte(',')
			}
			if err := writeCanonicalJSON(buffer, entry); err != nil {
				return err
			}
		}
		buffer.WriteByte(']')
	case map[string]any:
		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		buffer.WriteByte('{')
		for index, key := range keys {
			if index > 0 {
				buffer.WriteByte(',')
			}
			encoded, _ := json.Marshal(key)
			buffer.Write(encoded)
			buffer.WriteByte(':')
			if err := writeCanonicalJSON(buffer, typed[key]); err != nil {
				return err
			}
		}
		buffer.WriteByte('}')
	default:
		return fmt.Errorf("unsupported CSV JSON value %T", value)
	}
	return nil
}

func sortedSetKeys(set map[string]struct{}) []string {
	keys := make([]string, 0, len(set))
	for key := range set {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
